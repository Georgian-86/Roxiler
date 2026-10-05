const express = require('express');
const validate = require('../middleware/validate');
const { authenticate, authorize } = require('../middleware/auth');
const asyncHandler = require('../utils/asyncHandler');
const storeService = require('../services/storeService');
const f = require('../validators/fields');

const router = express.Router();
router.use(authenticate, authorize('OWNER'));

router.get(
  '/dashboard',
  validate(f.listQuery(storeService.RATER_SORT_KEYS)),
  asyncHandler(async (req, res) => res.json(await storeService.getOwnerDashboard(req.user.id, req.query)))
);

module.exports = router;
