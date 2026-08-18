const jwt = require('jsonwebtoken');
const redisClient = require('../config/redis');
const User = require('../models/User');
const { logSuppressedError } = require('../utils/errors');

const TOKEN_ERRORS = ['JsonWebTokenError', 'TokenExpiredError', 'NotBeforeError'];

const authMiddleware = async (req, res, next) => {
  try {
    const authHeader = req.headers.authorization || req.headers.Authorization;
    const token = authHeader && authHeader.startsWith('Bearer ') 
      ? authHeader.split(' ')[1] 
      : authHeader;

    if (!token) {
      return res.status(401).json({ message: 'No token provided' });
    }

    const decoded = jwt.verify(token, process.env.JWT_SECRET || 'fallback_secret');

    // Проверка Redis сессии (если клиент активен)
    if (redisClient && redisClient.isOpen) {
      try {
        const sessionToken = await redisClient.get(`session:${decoded.userId}`);
        if (sessionToken && sessionToken !== token) {
          return res.status(401).json({ message: 'Invalid session' });
        }
      } catch (redisErr) {
        // Проверка сессии не критична для аутентификации, но её отказ нельзя
        // терять: без логов невозможно заметить, что инвалидация сессий не работает.
        logSuppressedError('Не удалось проверить сессию в Redis', redisErr);
      }
    }

    // Загружаем пользователя из БД
    const user = await User.findById(decoded.userId).select('-password');
    if (!user) {
      return res.status(401).json({ message: 'User not found' });
    }

    req.user = user;          // полный объект пользователя
    req.userId = decoded.userId; // для обратной совместимости

    next();
  } catch (error) {
    // 401 только для реальных проблем с токеном. Сбои БД/инфраструктуры
    // раньше маскировались под «Unauthorized» и не логировались вообще.
    if (TOKEN_ERRORS.includes(error.name)) {
      return res.status(401).json({ message: 'Unauthorized', error: error.message });
    }
    return next(error);
  }
};

// Экспортируем функцию напрямую И как свойство объекта для абсолютной совместимости со всеми импортами
authMiddleware.authMiddleware = authMiddleware;
authMiddleware.protect = authMiddleware;

module.exports = authMiddleware;
module.exports.authMiddleware = authMiddleware;
