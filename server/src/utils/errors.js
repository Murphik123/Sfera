// src/utils/errors.js
// Общие утилиты для предсказуемой обработки и передачи ошибок в Express.

class AppError extends Error {
  constructor(message, status = 500, options = {}) {
    super(message);
    this.name = 'AppError';
    this.status = status;
    this.expose = options.expose !== undefined ? options.expose : status < 500;
    if (options.code) this.code = options.code;
    if (options.cause) this.cause = options.cause;
    Error.captureStackTrace(this, AppError);
  }
}

/**
 * Оборачивает асинхронный обработчик так, чтобы отклонённый промис
 * попадал в централизованный errorHandler, а не терялся молча.
 */
const asyncHandler = (handler) => (req, res, next) => {
  Promise.resolve(handler(req, res, next)).catch(next);
};

/**
 * Логирует ошибку, которая намеренно не прерывает основной сценарий
 * (best-effort операции: кеш, уведомления, аналитика).
 */
const logSuppressedError = (context, error) => {
  console.error(`⚠️ ${context}:`, error && error.stack ? error.stack : error);
};

module.exports = { AppError, asyncHandler, logSuppressedError };
