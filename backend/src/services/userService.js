const bcrypt = require('bcryptjs');
const db = require('../db/pool');
const config = require('../config');
const ApiError = require('../utils/ApiError');
const { buildListOptions, buildFilters, paginated } = require('../utils/listQuery');

const PUBLIC_FIELDS = 'u.id, u.name, u.email, u.address, u.role, u.created_at AS "createdAt"';

// Average rating of the store owned by a user (null for non-owners / no ratings).
const OWNER_RATING_SQL = `(
  SELECT ROUND(AVG(r.rating)::numeric, 2)::float
  FROM stores s JOIN ratings r ON r.store_id = s.id
  WHERE s.owner_id = u.id
)`;

const USER_SORTS = {
  name: 'u.name',
  email: 'u.email',
  address: 'u.address',
  role: 'u.role',
  createdAt: 'u.created_at',
  rating: OWNER_RATING_SQL,
};

async function createUser({ name, email, password, address, role = 'USER' }) {
  const passwordHash = await bcrypt.hash(password, config.bcryptRounds);
  const { rows } = await db.query(
    `INSERT INTO users (name, email, password_hash, address, role)
     VALUES ($1, $2, $3, $4, $5)
     RETURNING id, name, email, address, role, created_at AS "createdAt"`,
    [name, email, passwordHash, address, role]
  );
  return rows[0];
}

async function findByEmailWithPassword(email) {
  const { rows } = await db.query(
    'SELECT id, name, email, address, role, password_hash FROM users WHERE email = $1',
    [email]
  );
  return rows[0] || null;
}

async function changePassword(userId, currentPassword, newPassword) {
  const { rows } = await db.query('SELECT password_hash FROM users WHERE id = $1', [userId]);
  if (!rows[0]) throw ApiError.notFound('User not found');
  const matches = await bcrypt.compare(currentPassword, rows[0].password_hash);
  if (!matches) throw ApiError.badRequest('Validation failed', { currentPassword: 'Current password is incorrect' });
  if (currentPassword === newPassword) {
    throw ApiError.badRequest('Validation failed', { newPassword: 'New password must differ from the current one' });
  }
  const hash = await bcrypt.hash(newPassword, config.bcryptRounds);
  await db.query('UPDATE users SET password_hash = $1 WHERE id = $2', [hash, userId]);
}

async function listUsers(query) {
  const opts = buildListOptions(query, USER_SORTS, 'name', 'u.id');
  const { clauses, params } = buildFilters([
    { value: query.name, sql: 'u.name' },
    { value: query.email, sql: 'u.email::text' },
    { value: query.address, sql: 'u.address' },
    { value: query.role, sql: 'u.role::text', exact: true },
  ]);
  const where = clauses.length ? `WHERE ${clauses.join(' AND ')}` : '';
  params.push(opts.limit, opts.offset);
  const { rows } = await db.query(
    `SELECT ${PUBLIC_FIELDS},
            CASE WHEN u.role = 'OWNER' THEN ${OWNER_RATING_SQL} END AS rating,
            COUNT(*) OVER() AS total
     FROM users u ${where}
     ${opts.orderSql}
     LIMIT $${params.length - 1} OFFSET $${params.length}`,
    params
  );
  const total = rows[0] ? Number(rows[0].total) : 0;
  return paginated(rows.map(({ total: _t, ...r }) => r), total, opts);
}

async function getUserById(id) {
  const { rows } = await db.query(
    `SELECT ${PUBLIC_FIELDS},
            CASE WHEN u.role = 'OWNER' THEN ${OWNER_RATING_SQL} END AS rating,
            s.id AS "storeId", s.name AS "storeName"
     FROM users u LEFT JOIN stores s ON s.owner_id = u.id
     WHERE u.id = $1`,
    [id]
  );
  if (!rows[0]) throw ApiError.notFound('User not found');
  const { storeId, storeName, ...user } = rows[0];
  if (user.role === 'OWNER') user.store = storeId ? { id: storeId, name: storeName } : null;
  return user;
}

async function listAvailableOwners() {
  const { rows } = await db.query(
    `SELECT u.id, u.name, u.email FROM users u
     WHERE u.role = 'OWNER' AND NOT EXISTS (SELECT 1 FROM stores s WHERE s.owner_id = u.id)
     ORDER BY u.name`
  );
  return rows;
}

async function getDashboardStats() {
  const { rows } = await db.query(
    `SELECT (SELECT COUNT(*) FROM users)::int   AS "totalUsers",
            (SELECT COUNT(*) FROM stores)::int  AS "totalStores",
            (SELECT COUNT(*) FROM ratings)::int AS "totalRatings"`
  );
  return rows[0];
}

module.exports = {
  USER_SORT_KEYS: Object.keys(USER_SORTS),
  createUser,
  findByEmailWithPassword,
  changePassword,
  listUsers,
  getUserById,
  listAvailableOwners,
  getDashboardStats,
};
