const db = require('../db/pool');
const ApiError = require('../utils/ApiError');
const { buildListOptions, buildFilters, paginated, queryPage } = require('../utils/listQuery');

const RATING_AGG = `
  LEFT JOIN (
    SELECT store_id, ROUND(AVG(rating)::numeric, 2)::float AS avg_rating, COUNT(*)::int AS rating_count
    FROM ratings GROUP BY store_id
  ) agg ON agg.store_id = s.id`;

const STORE_SORTS = {
  name: 's.name',
  email: 's.email',
  address: 's.address',
  rating: 'agg.avg_rating',
  ratingCount: 'agg.rating_count',
  createdAt: 's.created_at',
};

const USER_STORE_SORTS = { ...STORE_SORTS, myRating: 'mine.rating' };

/** Friendly validation for an owner assignment; the UNIQUE constraint remains the final guard. */
async function assertAssignableOwner(ownerId, storeId = null) {
  const { rows } = await db.query(
    `SELECT u.role, s.id AS store_id FROM users u LEFT JOIN stores s ON s.owner_id = u.id WHERE u.id = $1`,
    [ownerId]
  );
  if (!rows[0]) throw ApiError.badRequest('Validation failed', { ownerId: 'Owner not found' });
  if (rows[0].role !== 'OWNER') {
    throw ApiError.badRequest('Validation failed', { ownerId: 'Selected user is not a store owner' });
  }
  if (rows[0].store_id && rows[0].store_id !== storeId) {
    throw ApiError.badRequest('Validation failed', { ownerId: 'This owner already has a store' });
  }
}

async function createStore({ name, email, address, ownerId }) {
  if (ownerId) await assertAssignableOwner(ownerId);
  const { rows } = await db.query(
    `INSERT INTO stores (name, email, address, owner_id) VALUES ($1, $2, $3, $4)
     RETURNING id, name, email, address, owner_id AS "ownerId", created_at AS "createdAt"`,
    [name, email, address, ownerId || null]
  );
  return rows[0];
}

/** Assigns (or clears, with null) the owner of an existing store. */
async function assignOwner(storeId, ownerId) {
  if (ownerId) await assertAssignableOwner(ownerId, storeId);
  const { rows } = await db.query(
    `UPDATE stores SET owner_id = $2 WHERE id = $1
     RETURNING id, name, email, address, owner_id AS "ownerId"`,
    [storeId, ownerId || null]
  );
  if (!rows[0]) throw ApiError.notFound('Store not found');
  return rows[0];
}

/** Admin listing: name, email, address, overall rating and owner. */
async function listStoresForAdmin(query) {
  const opts = buildListOptions(query, STORE_SORTS, 'name', 's.id');
  const { clauses, params } = buildFilters([
    { value: query.name, sql: 's.name' },
    { value: query.email, sql: 's.email::text' },
    { value: query.address, sql: 's.address' },
  ]);
  const where = clauses.length ? `WHERE ${clauses.join(' AND ')}` : '';
  params.push(opts.limit, opts.offset);
  return queryPage(
    db,
    `SELECT s.id, s.name, s.email, s.address, s.created_at AS "createdAt",
            agg.avg_rating AS rating, COALESCE(agg.rating_count, 0) AS "ratingCount",
            o.id AS "ownerId", o.name AS "ownerName",
            COUNT(*) OVER() AS total
     FROM stores s ${RATING_AGG}
     LEFT JOIN users o ON o.id = s.owner_id
     ${where}
     ${opts.orderSql}
     LIMIT $${params.length - 1} OFFSET $${params.length}`,
    params,
    opts
  );
}

/** Normal-user listing: overall rating plus the caller's own rating. */
async function listStoresForUser(userId, query) {
  const opts = buildListOptions(query, USER_STORE_SORTS, 'name', 's.id');
  const { clauses, params } = buildFilters(
    [
      { value: query.name, sql: 's.name' },
      { value: query.address, sql: 's.address' },
    ],
    2
  );
  // A single free-text search matches either name or address.
  if (query.search && String(query.search).trim()) {
    params.push(`%${String(query.search).trim().replace(/[\\%_]/g, (c) => `\\${c}`)}%`);
    const i = params.length + 1;
    clauses.push(`(s.name ILIKE $${i} OR s.address ILIKE $${i})`);
  }
  const where = clauses.length ? `WHERE ${clauses.join(' AND ')}` : '';
  const all = [userId, ...params, opts.limit, opts.offset];
  return queryPage(
    db,
    `SELECT s.id, s.name, s.address,
            agg.avg_rating AS rating, COALESCE(agg.rating_count, 0) AS "ratingCount",
            mine.rating AS "myRating",
            COUNT(*) OVER() AS total
     FROM stores s ${RATING_AGG}
     LEFT JOIN ratings mine ON mine.store_id = s.id AND mine.user_id = $1
     ${where}
     ${opts.orderSql}
     LIMIT $${all.length - 1} OFFSET $${all.length}`,
    all,
    opts
  );
}

/** Creates or updates the caller's rating for a store. */
async function upsertRating(userId, storeId, rating) {
  const store = await db.query('SELECT id FROM stores WHERE id = $1', [storeId]);
  if (!store.rowCount) throw ApiError.notFound('Store not found');
  const { rows } = await db.query(
    `INSERT INTO ratings (user_id, store_id, rating) VALUES ($1, $2, $3)
     ON CONFLICT (user_id, store_id) DO UPDATE SET rating = EXCLUDED.rating
     RETURNING (xmax = 0) AS created`,
    [userId, storeId, rating]
  );
  const summary = await db.query(
    `SELECT ROUND(AVG(rating)::numeric, 2)::float AS rating, COUNT(*)::int AS "ratingCount"
     FROM ratings WHERE store_id = $1`,
    [storeId]
  );
  return { created: rows[0].created, storeId, myRating: rating, ...summary.rows[0] };
}

const RATER_SORTS = { name: 'u.name', email: 'u.email', rating: 'r.rating', updatedAt: 'r.updated_at' };

/** Store-owner dashboard: their store, its average rating, and who rated it. */
async function getOwnerDashboard(ownerId, query) {
  const { rows: storeRows } = await db.query(
    `SELECT s.id, s.name, s.email, s.address,
            agg.avg_rating AS rating, COALESCE(agg.rating_count, 0) AS "ratingCount"
     FROM stores s ${RATING_AGG} WHERE s.owner_id = $1`,
    [ownerId]
  );
  const store = storeRows[0];
  const opts = buildListOptions(query, RATER_SORTS, 'updatedAt', 'u.id');
  if (!store) return { store: null, raters: paginated([], 0, opts) };

  const raters = await queryPage(
    db,
    `SELECT u.id, u.name, u.email, u.address, r.rating, r.updated_at AS "updatedAt",
            COUNT(*) OVER() AS total
     FROM ratings r JOIN users u ON u.id = r.user_id
     WHERE r.store_id = $1
     ${opts.orderSql}
     LIMIT $2 OFFSET $3`,
    [store.id, opts.limit, opts.offset],
    opts
  );
  const { rows: dist } = await db.query(
    'SELECT rating, COUNT(*)::int AS count FROM ratings WHERE store_id = $1 GROUP BY rating',
    [store.id]
  );
  const distribution = [1, 2, 3, 4, 5].map((n) => ({ rating: n, count: dist.find((d) => d.rating === n)?.count || 0 }));
  return { store: { ...store, distribution }, raters };
}

module.exports = {
  STORE_SORT_KEYS: Object.keys(STORE_SORTS),
  USER_STORE_SORT_KEYS: Object.keys(USER_STORE_SORTS),
  RATER_SORT_KEYS: Object.keys(RATER_SORTS),
  createStore,
  assignOwner,
  listStoresForAdmin,
  listStoresForUser,
  upsertRating,
  getOwnerDashboard,
};
