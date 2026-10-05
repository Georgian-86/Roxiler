const jwt = require('jsonwebtoken');
const config = require('../config');
const db = require('../db/pool');
const ApiError = require('../utils/ApiError');
const asyncHandler = require('../utils/asyncHandler');

const authenticate = asyncHandler(async (req, res, next) => {
  const header = req.headers.authorization || '';
  const [scheme, token] = header.split(' ');
  if (scheme !== 'Bearer' || !token) throw ApiError.unauthorized();

  let payload;
  try {
    payload = jwt.verify(token, config.jwtSecret);
  } catch {
    throw ApiError.unauthorized('Invalid or expired token');
  }

  // Re-read the user so deleted accounts or changed roles take effect immediately.
  const { rows } = await db.query('SELECT id, name, email, address, role FROM users WHERE id = $1', [payload.sub]);
  if (!rows[0]) throw ApiError.unauthorized('Account no longer exists');
  req.user = rows[0];
  next();
});

const authorize = (...roles) => (req, res, next) => {
  if (!req.user || !roles.includes(req.user.role)) return next(ApiError.forbidden());
  next();
};

module.exports = { authenticate, authorize };
