/**
 * Builds safe ORDER BY / LIMIT / OFFSET fragments from query params.
 * `sortable` maps public sort keys to trusted SQL expressions, so user input
 * never reaches the SQL string directly.
 */
function buildListOptions(query, sortable, defaultSort, tiebreaker = 'id') {
  const sortKey = Object.prototype.hasOwnProperty.call(sortable, query.sortBy) ? query.sortBy : defaultSort;
  const order = String(query.order).toLowerCase() === 'desc' ? 'DESC' : 'ASC';
  const page = Math.max(1, parseInt(query.page, 10) || 1);
  const limit = Math.min(100, Math.max(1, parseInt(query.limit, 10) || 10));
  return {
    sortBy: sortKey,
    order: order.toLowerCase(),
    page,
    limit,
    orderSql: `ORDER BY ${sortable[sortKey]} ${order} NULLS LAST, ${tiebreaker} ASC`,
    offset: (page - 1) * limit,
  };
}

/** Collects ILIKE filters for the provided columns. Returns where-clause parts and params. */
function buildFilters(filters, startIndex = 1) {
  const clauses = [];
  const params = [];
  for (const { value, sql, exact } of filters) {
    if (value === undefined || value === null || String(value).trim() === '') continue;
    params.push(exact ? String(value).trim() : `%${escapeLike(String(value).trim())}%`);
    clauses.push(exact ? `${sql} = $${startIndex + params.length - 1}` : `${sql} ILIKE $${startIndex + params.length - 1}`);
  }
  return { clauses, params };
}

function escapeLike(value) {
  return value.replace(/[\\%_]/g, (c) => `\\${c}`);
}

function paginated(rows, total, opts) {
  return {
    data: rows,
    meta: { total, page: opts.page, limit: opts.limit, totalPages: Math.max(1, Math.ceil(total / opts.limit)), sortBy: opts.sortBy, order: opts.order },
  };
}

/**
 * Runs a list query whose last two params are LIMIT and OFFSET and which selects
 * `COUNT(*) OVER() AS total`. A page past the end returns no rows (and so no total),
 * so in that case the total is recovered by re-running the query for its first row.
 */
async function queryPage(db, text, params, opts) {
  let { rows } = await db.query(text, params);
  let total = rows[0] ? Number(rows[0].total) : 0;
  if (!rows.length && opts.offset > 0) {
    const probe = await db.query(text, [...params.slice(0, -2), 1, 0]);
    total = probe.rows[0] ? Number(probe.rows[0].total) : 0;
  }
  rows = rows.map(({ total: _t, ...r }) => r);
  return paginated(rows, total, opts);
}

module.exports = { buildListOptions, buildFilters, paginated, queryPage };
