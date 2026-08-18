const { authMiddleware } = require('./auth');

const adminAuth = (req, res, next) => {
  // Сначала вызываем базовую аутентификацию
  authMiddleware(req, res, (err) => {
    // Ошибку аутентификации не подменяем на 401: пусть её классифицирует
    // и залогирует централизованный errorHandler.
    if (err) {
      return next(err);
    }

    if (!req.user || req.user.role !== 'admin') {
      return res.status(403).json({ message: 'Access denied. Admin only.' });
    }

    next();
  });
};

module.exports = { adminAuth };
