// authRoutes.js
const express = require('express');
const router = express.Router();

// 1. Вход пользователей и администраторов
router.post('/login', async (req, res) => {
  try {
    const { email, password } = req.body;

    // Симуляция/Поиск пользователя в БД
    let user = {
      id: "usr_" + Date.now(),
      email,
      name: email.split('@')[0],
      role: email.includes('admin') ? 'admin' : 'user'
    };

    // Фейковый токен для примера (в продакшене используйте jwt.sign)
    const token = `jwt_token_${user.id}_${user.role}`;

    res.json({
      success: true,
      token,
      user: {
        id: user.id,
        email: user.email,
        name: user.name,
        role: user.role
      }
    });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Ошибка при входе', error: error.message });
  }
});

// 2. Получение данных текущего пользователя (/me)
router.get('/me', async (req, res) => {
  const authHeader = req.headers.authorization;
  if (!authHeader) {
    return res.status(401).json({ success: false, message: 'Не авторизован' });
  }

  const token = authHeader.split(' ')[1];
  const isAdmin = token.includes('admin');

  res.json({
    success: true,
    user: {
      id: isAdmin ? 'admin_root' : 'user_regular',
      name: isAdmin ? 'Администратор SFERA' : 'Пользователь',
      role: isAdmin ? 'admin' : 'user'
    }
  });
});

module.exports = router;
