const router = require('express').Router();
const { register, login, logout, getMe } = require('../controllers/authController');
const { authMiddleware } = require('../middleware/auth');

router.post('/register', register);
router.post('/login', login);
router.post('/logout', authMiddleware, logout);
router.get('/me', authMiddleware, getMe);   // новый эндпоинт

module.exports = router;
