const jwt = require('jsonwebtoken');

const JWT_SECRET = process.env.JWT_SECRET || 'your-super-secret-jwt-key-change-this-in-production';

const TOKEN_ERRORS = ['JsonWebTokenError', 'TokenExpiredError', 'NotBeforeError'];

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
 * Верификация JWT токена.
 * Возвращает null для невалидного токена, при этом причина попадает в логи,
 * а неожиданные ошибки (например, отсутствие секрета) пробрасываются вызывающему.
 */
exports.verifyToken = (token) => {
    try {
        return jwt.verify(token, JWT_SECRET);
    } catch (error) {
        if (TOKEN_ERRORS.includes(error.name)) {
            console.warn(`⚠️ Отклонён JWT токен (${error.name}): ${error.message}`);
            return null;
        }
        throw error;
    }
};
