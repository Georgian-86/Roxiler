const express = require('express');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const { body } = require('express-validator');
const config = require('../config');
const validate = require('../middleware/validate');
const { authenticate } = require('../middleware/auth');
const asyncHandler = require('../utils/asyncHandler');
const ApiError = require('../utils/ApiError');
const userService = require('../services/userService');
const f = require('../validators/fields');

const router = express.Router();

// Used to equalise timing when the email does not exist.
const DUMMY_HASH = bcrypt.hashSync('timing-safe-dummy', 4);

function issueToken(user) {
  return jwt.sign({ sub: user.id, role: user.role }, config.jwtSecret, { expiresIn: config.jwtExpiresIn });
}

// Public sign-up always creates a normal user; roles cannot be self-assigned.
router.post(
  '/register',
  validate([f.name(), f.email(), f.address(), f.password()]),
  asyncHandler(async (req, res) => {
    const { name, email, address, password } = req.body;
    const existing = await userService.findByEmailWithPassword(email);
    if (existing) throw ApiError.badRequest('Validation failed', { email: 'An account with this email already exists' });
    const user = await userService.createUser({ name, email, address, password, role: 'USER' });
    res.status(201).json({ token: issueToken(user), user });
  })
);

router.post(
  '/login',
  validate([
    body('email').isString().trim().isEmail().withMessage('Enter a valid email address').normalizeEmail({ all_lowercase: true, gmail_remove_dots: false, gmail_remove_subaddress: false }),
    body('password').isString().notEmpty().withMessage('Password is required'),
  ]),
  asyncHandler(async (req, res) => {
    const { email, password } = req.body;
    const user = await userService.findByEmailWithPassword(email);
    const ok = await bcrypt.compare(password, user ? user.password_hash : DUMMY_HASH);
    if (!user || !ok) throw ApiError.unauthorized('Invalid email or password');
    const { password_hash: _ph, ...publicUser } = user;
    res.json({ token: issueToken(publicUser), user: publicUser });
  })
);

router.get('/me', authenticate, (req, res) => res.json({ user: req.user }));

router.patch(
  '/password',
  authenticate,
  validate([
    body('currentPassword').isString().notEmpty().withMessage('Current password is required'),
    f.password('newPassword'),
  ]),
  asyncHandler(async (req, res) => {
    await userService.changePassword(req.user.id, req.body.currentPassword, req.body.newPassword);
    res.json({ message: 'Password updated successfully' });
  })
);

module.exports = router;
