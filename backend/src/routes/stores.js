const express = require('express');
const { body } = require('express-validator');
const validate = require('../middleware/validate');
const { authenticate, authorize } = require('../middleware/auth');
const asyncHandler = require('../utils/asyncHandler');
const storeService = require('../services/storeService');
const f = require('../validators/fields');

const router = express.Router();
router.use(authenticate, authorize('USER'));

router.get(
  '/',
  validate(f.listQuery(storeService.USER_STORE_SORT_KEYS)),
  asyncHandler(async (req, res) => res.json(await storeService.listStoresForUser(req.user.id, req.query)))
);

router.put(
  '/:id/rating',
  validate([
    f.idParam(),
    body('rating').isInt({ min: 1, max: 5 }).withMessage('Rating must be a whole number from 1 to 5').toInt(),
  ]),
  asyncHandler(async (req, res) => {
    const result = await storeService.upsertRating(req.user.id, req.params.id, req.body.rating);
    res.status(result.created ? 201 : 200).json(result);
  })
);

module.exports = router;
