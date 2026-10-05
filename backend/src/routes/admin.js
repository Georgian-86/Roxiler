const express = require('express');
const { body } = require('express-validator');
const validate = require('../middleware/validate');
const { authenticate, authorize } = require('../middleware/auth');
const asyncHandler = require('../utils/asyncHandler');
const userService = require('../services/userService');
const storeService = require('../services/storeService');
const f = require('../validators/fields');

const router = express.Router();
router.use(authenticate, authorize('ADMIN'));

router.get('/dashboard', asyncHandler(async (req, res) => {
  res.json(await userService.getDashboardStats());
}));

router.get(
  '/users',
  validate(f.listQuery(userService.USER_SORT_KEYS)),
  asyncHandler(async (req, res) => res.json(await userService.listUsers(req.query)))
);

router.post(
  '/users',
  validate([f.name(), f.email(), f.address(), f.password(), f.role()]),
  asyncHandler(async (req, res) => {
    const user = await userService.createUser(req.body);
    res.status(201).json({ user });
  })
);

router.get(
  '/users/:id',
  validate([f.idParam()]),
  asyncHandler(async (req, res) => res.json({ user: await userService.getUserById(req.params.id) }))
);

router.get('/owners/available', asyncHandler(async (req, res) => {
  res.json({ data: await userService.listAvailableOwners() });
}));

router.get(
  '/stores',
  validate(f.listQuery(storeService.STORE_SORT_KEYS)),
  asyncHandler(async (req, res) => res.json(await storeService.listStoresForAdmin(req.query)))
);

router.post(
  '/stores',
  validate([
    f.name(),
    f.email(),
    f.address(),
    body('ownerId').optional({ values: 'falsy' }).isInt({ min: 1 }).withMessage('Invalid owner').toInt(),
  ]),
  asyncHandler(async (req, res) => {
    const store = await storeService.createStore(req.body);
    res.status(201).json({ store });
  })
);

module.exports = router;
