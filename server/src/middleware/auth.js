const jwt = require('jsonwebtoken');
const redisClient = require('../config/redis');

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

    req.userId = decoded.userId;
    next();
  } catch (error) {
    return res.status(401).json({ message: 'Unauthorized' });
  }
};

module.exports = { authMiddleware };
