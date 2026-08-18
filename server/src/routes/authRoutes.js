/* ==========================================================================
   SFERA PLATFORM — AUTHENTICATION ROUTES (authRoutes.js)
   ========================================================================== */

const express = require('express');
const rateLimit = require('express-rate-limit');
const router = express.Router();

const { register, login, logout, getMe } = require('../controllers/authController');
const { authMiddleware } = require('../middleware/auth');

const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 20,
  standardHeaders: true,
  legacyHeaders: false,
  message: { message: 'Слишком много попыток. Попробуйте позже.' }
});

router.post('/login', authLimiter, login);
router.post('/register', authLimiter, register);
router.get('/me', authMiddleware, getMe);
router.post('/logout', authMiddleware, logout);

module.exports = router;
