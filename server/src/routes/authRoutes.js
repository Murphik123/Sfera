const express = require('express');
const router = express.Router();
const authController = require('../controllers/authController');

// Пути должны быть относительно /api/auth
// В итоге получится: POST /api/auth/login и POST /api/auth/register
router.post('/login', authController.login);
router.post('/register', authController.register);

module.exports = router;
