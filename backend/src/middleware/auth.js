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
  const { rows } = await db.query(
    'SELECT id, name, email, address, role, password_changed_at FROM users WHERE id = $1',
    [payload.sub]
  );
  const user = rows[0];
  if (!user) throw ApiError.unauthorized('Account no longer exists');
  // Tokens issued before the latest password change are revoked (iat has second precision).
  if (payload.iat < Math.floor(user.password_changed_at.getTime() / 1000)) {
    throw ApiError.unauthorized('Session expired, please log in again');
  }
  const { password_changed_at: _pca, ...publicUser } = user;
  req.user = publicUser;
  next();
});

const authorize = (...roles) => (req, res, next) => {
  if (!req.user || !roles.includes(req.user.role)) return next(ApiError.forbidden());
  next();
};

module.exports = { authenticate, authorize };
