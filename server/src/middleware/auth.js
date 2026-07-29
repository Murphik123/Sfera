const jwt = require('jsonwebtoken');
const redisClient = require('../config/redis');
const User = require('../models/User');

const authMiddleware = async (req, res, next) => {
  try {
    const token = req.headers.authorization?.split(' ')[1];
    if (!token) {
      return res.status(401).json({ message: 'No token provided' });
    }

    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    const sessionToken = await redisClient.get(`session:${decoded.userId}`);
    if (sessionToken !== token) {
      return res.status(401).json({ message: 'Invalid session' });
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
    return res.status(401).json({ message: 'Unauthorized' });
  }
};

module.exports = { authMiddleware };
