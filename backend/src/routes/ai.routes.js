const express = require('express');
const { chatWithAssistant } = require('../controllers/ai.controller');
const { authenticate } = require('../middleware/auth.middleware');
const { requireTenant } = require('../middleware/tenant.middleware');

const router = express.Router();

router.use(authenticate);
router.use(requireTenant);

router.post('/chat', chatWithAssistant);

module.exports = router;
