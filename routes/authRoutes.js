const express = require('express');
const { login, logout, getCurrentUser } = require('../controllers/authController');
const { protect } = require('../middleware/auth');

const router = express.Router();

router.post('/login', login);
router.post('/logout', protect, logout);
router.get('/me', protect, getCurrentUser);

module.exports = router;
