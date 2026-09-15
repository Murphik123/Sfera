/* ==========================================================================
   SFERA PLATFORM — AUTHENTICATION ROUTES (authRoutes.js)
   ========================================================================== */

const express = require('express');
const router = express.Router();

// 1. Вход пользователей и администраторов (POST /api/auth/login)
router.post('/login', async (req, res) => {
  try {
    const { email, password } = req.body;

    if (!email || !password) {
      return res.status(400).json({ 
        success: false, 
        message: 'Пожалуйста, укажите email и пароль' 
      });
    }

    // Симуляция поиска пользователя в базе данных
    const isAdmin = email.toLowerCase().includes('admin');
    const user = {
      id: isAdmin ? 'usr_admin_1' : 'usr_' + Date.now(),
      email: email,
      name: email.split('@')[0],
      role: isAdmin ? 'admin' : 'user'
    };

    // Токен авторизации
    const token = `sfera_token_${user.id}_${user.role}_${Date.now()}`;

    return res.json({
      success: true,
      message: 'Успешная авторизация',
      token,
      user: {
        id: user.id,
        email: user.email,
        name: user.name,
        role: user.role
      }
    });
  } catch (error) {
    return res.status(500).json({ 
      success: false, 
      message: 'Ошибка сервера при входе', 
      error: error.message 
    });
  }
});

// 2. Регистрация нового пользователя (POST /api/auth/register)
router.post('/register', async (req, res) => {
  try {
    const { email, password, name } = req.body;

    if (!email || !password) {
      return res.status(400).json({ 
        success: false, 
        message: 'Заполните обязательные поля' 
      });
    }

    const newUser = {
      id: 'usr_' + Date.now(),
      email,
      name: name || email.split('@')[0],
      role: 'user'
    };

    const token = `sfera_token_${newUser.id}_user_${Date.now()}`;

    return res.status(201).json({
      success: true,
      message: 'Регистрация прошла успешно',
      token,
      user: newUser
    });
  } catch (error) {
    return res.status(500).json({ 
      success: false, 
      message: 'Ошибка при регистрации', 
      error: error.message 
    });
  }
});

// 3. Получение данных текущей сессии (GET /api/auth/me)
router.get('/me', async (req, res) => {
  try {
    const authHeader = req.headers.authorization;
    if (!authHeader) {
      return res.status(401).json({ 
        success: false, 
        message: 'Токен авторизации отсутствует' 
      });
    }

    const token = authHeader.split(' ')[1] || authHeader;
    const isAdmin = token.includes('admin');

    return res.json({
      success: true,
      user: {
        id: isAdmin ? 'usr_admin_1' : 'usr_regular_1',
        name: isAdmin ? 'Администратор SFERA' : 'Пользователь SFERA',
        role: isAdmin ? 'admin' : 'user'
      }
    });
  } catch (error) {
    return res.status(500).json({ 
      success: false, 
      message: 'Ошибка при проверке сессии', 
      error: error.message 
    });
  }
});

// 4. Завершение сессии (POST /api/auth/logout)
router.post('/logout', (req, res) => {
  return res.json({ 
    success: true, 
    message: 'Сессия успешно завершена' 
  });
});

module.exports = router;
