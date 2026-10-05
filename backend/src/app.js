const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const morgan = require('morgan');
const rateLimit = require('express-rate-limit');
const config = require('./config');
const { notFound, errorHandler } = require('./middleware/error');
const db = require('./db/pool');

const app = express();

app.use(helmet());
app.use(cors({ origin: config.corsOrigin.split(',') }));
app.use(express.json({ limit: '10kb' }));
if (config.env === 'development') app.use(morgan('dev'));

// Set TRUST_PROXY (e.g. "1") when running behind a reverse proxy so limits apply per client IP.
if (process.env.TRUST_PROXY) app.set('trust proxy', Number(process.env.TRUST_PROXY) || process.env.TRUST_PROXY);

// Brute-force protection for credential endpoints only (not /me, which runs on every page load).
const credentialLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  limit: 20,
  standardHeaders: 'draft-7',
  legacyHeaders: false,
  skipSuccessfulRequests: true,
  message: { message: 'Too many attempts, please try again later' },
});

app.get('/api/health', async (req, res) => {
  try {
    await db.query('SELECT 1');
    res.json({ status: 'ok', database: 'up' });
  } catch {
    res.status(503).json({ status: 'degraded', database: 'down' });
  }
});
if (config.env !== 'test') app.use(['/api/auth/login', '/api/auth/register'], credentialLimiter);
app.use('/api/auth', require('./routes/auth'));
app.use('/api/admin', require('./routes/admin'));
app.use('/api/stores', require('./routes/stores'));
app.use('/api/owner', require('./routes/owner'));

app.use(notFound);
app.use(errorHandler);

module.exports = app;
