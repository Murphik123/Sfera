const redisClient = require('../config/redis');

/**
 * Единый формат ключа сессии в Redis.
 */
const sessionKey = (userId) => `session:${userId}`;

/**
 * Все операции безопасны: недоступность Redis не должна ломать авторизацию.
 */
const saveSession = async (userId, token) => {
    try {
        await redisClient.set(sessionKey(userId), token);
        return true;
    } catch (error) {
        console.log('⚠️ Redis session save skipped:', error.message);
        return false;
    }
};

const clearSession = async (userId) => {
    if (!userId) return false;
    try {
        await redisClient.del(sessionKey(userId));
        return true;
    } catch (error) {
        console.log('⚠️ Redis session clear skipped:', error.message);
        return false;
    }
};

/**
 * Возвращает сохранённый токен или null, если Redis недоступен/пуст.
 */
const getSessionToken = async (userId) => {
    if (!redisClient || !redisClient.isOpen) return null;
    try {
        return await redisClient.get(sessionKey(userId));
    } catch (error) {
        console.warn('Redis check warning:', error.message);
        return null;
    }
};

module.exports = { sessionKey, saveSession, clearSession, getSessionToken };
