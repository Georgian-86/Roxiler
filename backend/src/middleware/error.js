const ApiError = require('../utils/ApiError');
const config = require('../config');

function notFound(req, res, next) {
  next(ApiError.notFound(`Route ${req.method} ${req.originalUrl} not found`));
}

// eslint-disable-next-line no-unused-vars
function errorHandler(err, req, res, next) {
  if (err.type === 'entity.parse.failed') {
    return res.status(400).json({ message: 'Malformed JSON body' });
  }
  if (err.code === '23505') {
    const message = /owner_id/.test(err.constraint || '')
      ? 'This owner already has a store'
      : 'A record with this email already exists';
    return res.status(409).json({ message });
  }
  if (err.code === '23514' || err.code === '22001') {
    return res.status(400).json({ message: 'One or more fields are invalid' });
  }
  const status = err instanceof ApiError ? err.status : 500;
  if (status === 500 && config.env !== 'test') console.error(err);
  res.status(status).json({
    message: status === 500 ? 'Internal server error' : err.message,
    ...(err.details ? { errors: err.details } : {}),
  });
}

module.exports = { notFound, errorHandler };
