const express = require('express');
const { listActivities, getEntityActivities } = require('../controllers/activity.controller');
const { authenticate } = require('../middleware/auth.middleware');
const { requireTenant } = require('../middleware/tenant.middleware');

const router = express.Router();

router.use(authenticate);
router.use(requireTenant);

router.get('/', listActivities);
router.get('/entity/:entityType/:entityId', getEntityActivities);

module.exports = router;
