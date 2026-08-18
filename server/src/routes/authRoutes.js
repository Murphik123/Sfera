/* ==========================================================================
   SFERA PLATFORM — AUTHENTICATION ROUTES (authRoutes.js)
   ========================================================================== */

const express = require('express');
const router = express.Router();

const asyncHandler = require('../utils/asyncHandler');
const { ApiError } = require('../utils/apiError');
const { assertRequiredFields } = require('../utils/validation');

/**
 * Формат демо-токена для заглушечных маршрутов.
 */
const issueToken = (userId, role) => `sfera_token_${userId}_${role}_${Date.now()}`;

const stubOptions = (message) => ({ format: 'success', message });

// 1. Вход пользователей и администраторов (POST /api/auth/login)
router.post('/login', asyncHandler(async (req, res) => {
  const { email } = req.body;

  assertRequiredFields(req.body, ['email', 'password'], 'Пожалуйста, укажите email и пароль');

  // Симуляция поиска пользователя в базе данных
  const isAdmin = email.toLowerCase().includes('admin');
  const user = {
    id: isAdmin ? 'usr_admin_1' : 'usr_' + Date.now(),
    email,
    name: email.split('@')[0],
    role: isAdmin ? 'admin' : 'user'
  };

  return res.json({
    success: true,
    message: 'Успешная авторизация',
    token: issueToken(user.id, user.role),
    user
  });
}, stubOptions('Ошибка сервера при входе')));

// 2. Регистрация нового пользователя (POST /api/auth/register)
router.post('/register', asyncHandler(async (req, res) => {
  const { email, name } = req.body;

  assertRequiredFields(req.body, ['email', 'password'], 'Заполните обязательные поля');

  const newUser = {
    id: 'usr_' + Date.now(),
    email,
    name: name || email.split('@')[0],
    role: 'user'
  };

  return res.status(201).json({
    success: true,
    message: 'Регистрация прошла успешно',
    token: issueToken(newUser.id, newUser.role),
    user: newUser
  });
}, stubOptions('Ошибка при регистрации')));

// 3. Получение данных текущей сессии (GET /api/auth/me)
router.get('/me', asyncHandler(async (req, res) => {
  const authHeader = req.headers.authorization;
  if (!authHeader) {
    throw ApiError.unauthorized('Токен авторизации отсутствует');
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
}, stubOptions('Ошибка при проверке сессии')));

// 4. Завершение сессии (POST /api/auth/logout)
router.post('/logout', (req, res) => {
  return res.json({ 
    success: true, 
    message: 'Сессия успешно завершена' 
  });
});

module.exports = router;
