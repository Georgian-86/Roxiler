const { validationResult } = require('express-validator');
const ApiError = require('../utils/ApiError');

// Runs the given express-validator chains and rejects with field-level errors.
module.exports = (chains) => [
  ...chains,
  (req, res, next) => {
    const result = validationResult(req);
    if (result.isEmpty()) return next();
    const errors = {};
    for (const err of result.array()) {
      if (!errors[err.path]) errors[err.path] = err.msg;
    }
    next(ApiError.badRequest('Validation failed', errors));
  },
];
