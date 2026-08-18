const express = require('express');
const router = express.Router();

// 1. Подключаем миддлвар авторизации (наш файл auth.js в папке middleware)
const authMiddleware = require('../middleware/auth');
const asyncHandler = require('../utils/asyncHandler');

// 2. Пример получения профиля текущего пользователя (защищенный маршрут)
router.get('/profile', authMiddleware, asyncHandler(async (req, res) => {
  // Пользователь уже загружен в req.user внутри authMiddleware
  res.json({
    success: true,
    user: req.user
  });
}, { message: 'Ошибка сервера при получении профиля' }));

// 3. Пример обновления данных пользователя
router.put('/profile', authMiddleware, asyncHandler(async (req, res) => {
  // Логика обновления...
  res.json({ success: true, message: 'Профиль обновлен' });
}, { message: 'Ошибка при обновлении профиля' }));

// =============================================================================
// КРИТИЧЕСКИ ВАЖНО: Экспортируем САМ роутер, а НЕ объект!
// ❌ НЕПРАВИЛЬНО: module.exports = { router };
// ❌ НЕПРАВИЛЬНО: module.exports = { userRoutes: router };
// =============================================================================
module.exports = router;
