const express = require('express');
const { register, login, getMe, getDemoUsers } = require('../controllers/auth.controller');
const { authenticate } = require('../middleware/auth.middleware');

const router = express.Router();

router.post('/register', register);
router.post('/login', login);
router.get('/me', authenticate, getMe);
router.get('/demo-users', getDemoUsers);

module.exports = router;
