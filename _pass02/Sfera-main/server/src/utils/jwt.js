const jwt = require('jsonwebtoken');

const JWT_SECRET = process.env.JWT_SECRET || 'your-super-secret-jwt-key-change-this-in-production';

/**
 * Генерация JWT токена
 */
exports.generateToken = (userId) => {
    return jwt.sign(
        { userId },
        JWT_SECRET,
        { expiresIn: '7d' }
    );
};

/**
 * Верификация JWT токена
 */
exports.verifyToken = (token) => {
    try {
        return jwt.verify(token, JWT_SECRET);
    } catch (error) {
        return null;
    }
};
