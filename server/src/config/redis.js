// server/src/config/redis.js
class RedisMock {
  constructor() {
    this.store = new Map();
    this.expirations = new Map();
  }

  async get(key) {
    const expiresAt = this.expirations.get(key);
    if (expiresAt !== undefined && expiresAt <= Date.now()) {
      this.store.delete(key);
      this.expirations.delete(key);
      return null;
    }
    return this.store.get(key) || null;
  }

  async set(key, value, mode, duration) {
    this.store.set(key, value);
    this.expirations.delete(key);

    // Раньше TTL молча игнорировался, и кеш жил до перезапуска процесса.
    if (mode) {
      const normalized = String(mode).toUpperCase();
      const ttlMs = normalized === 'EX' ? Number(duration) * 1000
        : normalized === 'PX' ? Number(duration)
          : null;

      if (ttlMs === null) {
        console.warn(`⚠️ Redis mock: режим SET «${mode}» не поддерживается и будет проигнорирован`);
      } else if (!Number.isFinite(ttlMs) || ttlMs <= 0) {
        throw new Error(`Redis mock: некорректный TTL для ключа ${key}: ${duration}`);
      } else {
        this.expirations.set(key, Date.now() + ttlMs);
      }
    }

    return 'OK';
  }

  async del(key) {
    this.store.delete(key);
    this.expirations.delete(key);
    return 1;
  }

  async sadd(key, value) {
    if (!this.store.has(key)) {
      this.store.set(key, new Set());
    }
    this.store.get(key).add(value);
    return 1;
  }

  async srem(key, value) {
    if (this.store.has(key)) {
      this.store.get(key).delete(value);
    }
    return 1;
  }

  async scard(key) {
    return this.store.has(key) ? this.store.get(key).size : 0;
  }

  async smembers(key) {
    return this.store.has(key) ? Array.from(this.store.get(key)) : [];
  }

  on(event, callback) {
    if (event === 'connect') {
      // Симулируем успешное подключение
      setTimeout(callback, 10);
    }
    // У mock-а нет сетевых ошибок, но подписка не должна исчезать беззвучно.
    if (event === 'error') {
      console.warn('⚠️ Redis mock: обработчик error зарегистрирован, но события не генерируются');
    }
    return this;
  }

  connect() {
    console.log('⚠️ Redis mock: using in-memory storage');
    return this;
  }

  quit() {
    return Promise.resolve('OK');
  }
}

const client = new RedisMock();
module.exports = client;
