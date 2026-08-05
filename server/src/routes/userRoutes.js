const express = require('express');
const router = express.Router();

// 1. Подключаем миддлвар авторизации (наш файл auth.js в папке middleware)
const authMiddleware = require('../middleware/auth');

// 2. Пример получения профиля текущего пользователя (защищенный маршрут)
router.get('/profile', authMiddleware, async (req, res) => {
  try {
    // Пользователь уже загружен в req.user внутри authMiddleware
    res.json({
      success: true,
      user: req.user
    });
  } catch (error) {
    res.status(500).json({ message: 'Ошибка сервера при получении профиля', error: error.message });
  }
});

// 3. Пример обновления данных пользователя
router.put('/profile', authMiddleware, async (req, res) => {
  try {
    const updates = req.body;
    // Логика обновления...
    res.json({ success: true, message: 'Профиль обновлен' });
  } catch (error) {
    res.status(500).json({ message: 'Ошибка при обновлении профиля', error: error.message });
  }
});

// =============================================================================
// КРИТИЧЕСКИ ВАЖНО: Экспортируем САМ роутер, а НЕ объект!
// ❌ НЕПРАВИЛЬНО: module.exports = { router };
// ❌ НЕПРАВИЛЬНО: module.exports = { userRoutes: router };
// =============================================================================
module.exports = router;
