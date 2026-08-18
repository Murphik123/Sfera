const redisClient = require('../config/redis');

/**
 * Читает JSON из кеша; null, если значения нет или оно повреждено.
 */
const get = async (key) => {
    try {
        const cached = await redisClient.get(key);
        return cached ? JSON.parse(cached) : null;
    } catch (error) {
        console.warn(`Cache read warning (${key}):`, error.message);
        return null;
    }
};

/**
 * Пишет JSON в кеш с временем жизни в секундах.
 */
const set = async (key, value, ttlSeconds) => {
    try {
        await redisClient.set(key, JSON.stringify(value), 'EX', ttlSeconds);
    } catch (error) {
        console.warn(`Cache write warning (${key}):`, error.message);
    }
};

const forget = async (key) => {
    try {
        await redisClient.del(key);
    } catch (error) {
        console.warn(`Cache invalidation warning (${key}):`, error.message);
    }
};

/**
 * Кеш-аside: возвращает значение из кеша либо вычисляет его и кеширует.
 *
 * @param {string} key
 * @param {number} ttlSeconds
 * @param {() => Promise<any>} loader
 */
const remember = async (key, ttlSeconds, loader) => {
    const cached = await get(key);
    if (cached !== null) return cached;

    const value = await loader();
    await set(key, value, ttlSeconds);
    return value;
};

module.exports = { get, set, forget, remember };
