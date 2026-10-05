const { Pool } = require('pg');
const config = require('../config');

const pool = new Pool({
  connectionString: config.databaseUrl,
  // Managed Postgres (e.g. Supabase's pooler) needs TLS; local Postgres usually doesn't.
  ssl: config.databaseSsl ? { rejectUnauthorized: false } : undefined,
  max: config.dbPoolMax,
  idleTimeoutMillis: 10000,
  connectionTimeoutMillis: 10000,
});

module.exports = {
  pool,
  query: (text, params) => pool.query(text, params),
};
