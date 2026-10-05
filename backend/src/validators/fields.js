const { body, query, param } = require('express-validator');

// Shared field rules matching the spec; the frontend mirrors these.
const PASSWORD_REGEX = /^(?=.*[A-Z])(?=.*[^A-Za-z0-9]).{8,16}$/;
const ROLES = ['ADMIN', 'USER', 'OWNER'];

const name = (field = 'name') =>
  body(field)
    .isString().withMessage('Name is required')
    .trim()
    .isLength({ min: 20, max: 60 }).withMessage('Name must be between 20 and 60 characters');

const email = (field = 'email') =>
  body(field)
    .isString().withMessage('Email is required')
    .trim()
    .isEmail().withMessage('Enter a valid email address')
    .isLength({ max: 254 }).withMessage('Email is too long')
    .normalizeEmail({ gmail_remove_dots: false, gmail_remove_subaddress: false, all_lowercase: true });

const address = (field = 'address') =>
  body(field)
    .isString().withMessage('Address is required')
    .trim()
    .notEmpty().withMessage('Address is required')
    .isLength({ max: 400 }).withMessage('Address must be at most 400 characters');

const password = (field = 'password') =>
  body(field)
    .isString().withMessage('Password is required')
    .matches(PASSWORD_REGEX)
    .withMessage('Password must be 8-16 characters with at least one uppercase letter and one special character');

const role = () => body('role').isIn(ROLES).withMessage(`Role must be one of ${ROLES.join(', ')}`);

const idParam = (field = 'id') => param(field).isInt({ min: 1 }).withMessage('Invalid id').toInt();

const listQuery = (sortKeys) => [
  query('sortBy').optional().isIn(sortKeys).withMessage(`sortBy must be one of ${sortKeys.join(', ')}`),
  query('order').optional().isIn(['asc', 'desc', 'ASC', 'DESC']).withMessage('order must be asc or desc'),
  query('page').optional().isInt({ min: 1 }).withMessage('page must be a positive integer'),
  query('limit').optional().isInt({ min: 1, max: 100 }).withMessage('limit must be between 1 and 100'),
];

module.exports = { name, email, address, password, role, idParam, listQuery, PASSWORD_REGEX, ROLES };
