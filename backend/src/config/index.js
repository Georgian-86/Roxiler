require('dotenv').config();

const env = process.env.NODE_ENV || 'development';

const config = {
  env,
  port: Number(process.env.PORT) || 4000,
  databaseUrl:
    env === 'test'
      ? process.env.TEST_DATABASE_URL || 'postgres://roxiler:roxiler@localhost:5432/roxiler_test'
      : process.env.DATABASE_URL || 'postgres://roxiler:roxiler@localhost:5432/roxiler',
  jwtSecret: process.env.JWT_SECRET || (env === 'production' ? undefined : 'dev-only-insecure-secret'),
  jwtExpiresIn: process.env.JWT_EXPIRES_IN || '1d',
  corsOrigin: process.env.CORS_ORIGIN || 'http://localhost:5173',
  databaseSsl: process.env.DATABASE_SSL === 'true',
  // Keep this small on serverless, where many instances may each hold a pool.
  dbPoolMax: Number(process.env.DB_POOL_MAX) || 10,
  bcryptRounds: env === 'test' ? 4 : 10,
};

if (!config.jwtSecret) {
  throw new Error('JWT_SECRET must be set in production');
}

module.exports = config;
