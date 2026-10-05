const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const morgan = require('morgan');
const rateLimit = require('express-rate-limit');
const config = require('./config');
const { notFound, errorHandler } = require('./middleware/error');

const app = express();

app.use(helmet());
app.use(cors({ origin: config.corsOrigin.split(',') }));
app.use(express.json({ limit: '10kb' }));
if (config.env === 'development') app.use(morgan('dev'));

const authLimiter = rateLimit({ windowMs: 15 * 60 * 1000, limit: 100, standardHeaders: 'draft-7', legacyHeaders: false });

app.get('/api/health', (req, res) => res.json({ status: 'ok' }));
app.use('/api/auth', config.env === 'test' ? [] : authLimiter, require('./routes/auth'));
app.use('/api/admin', require('./routes/admin'));
app.use('/api/stores', require('./routes/stores'));
app.use('/api/owner', require('./routes/owner'));

app.use(notFound);
app.use(errorHandler);

module.exports = app;
