const { AppError } = require('../utils/errors');

const isProduction = () => process.env.NODE_ENV === 'production';

// Преобразуем известные типы ошибок в HTTP-статусы вместо «глухих» 500.
const classify = (err) => {
  if (err.status || err.statusCode) {
    return { status: err.status || err.statusCode };
  }

  switch (err.name) {
    case 'CastError':
      return { status: 400, message: `Некорректное значение поля ${err.path}` };
    case 'ValidationError':
      return {
        status: 400,
        message: 'Ошибка валидации данных',
        details: Object.values(err.errors || {}).map((e) => e.message)
      };
    case 'MulterError':
      return {
        status: err.code === 'LIMIT_FILE_SIZE' ? 413 : 400,
        message: `Ошибка загрузки файла: ${err.message}`
      };
    case 'JsonWebTokenError':
    case 'TokenExpiredError':
      return { status: 401, message: 'Недействительный или истёкший токен' };
    case 'MongooseServerSelectionError':
    case 'MongoNetworkError':
      return { status: 503, message: 'База данных недоступна, попробуйте позже' };
    default:
      break;
  }

  if (err.code === 11000) {
    return { status: 409, message: 'Запись с такими данными уже существует' };
  }

  // Мангуз буферизует запросы без подключения и отклоняет их по таймауту.
  if (typeof err.message === 'string' && err.message.includes('buffering timed out')) {
    return { status: 503, message: 'База данных недоступна, попробуйте позже' };
  }

  return { status: 500 };
};

const errorHandler = (err, req, res, next) => {
  const { status, message, details } = classify(err);

  const logLine = `${req.method} ${req.originalUrl} -> ${status}`;
  if (status >= 500) {
    console.error(`❌ ${logLine}:`, err.stack || err);
    if (err.cause) {
      console.error('   ↳ причина:', err.cause.stack || err.cause);
    }
  } else {
    console.warn(`⚠️ ${logLine}: ${err.message}`);
  }

  // Если ответ уже начал отправляться, отдаём ошибку встроенному обработчику,
  // иначе соединение останется висеть без реакции.
  if (res.headersSent) {
    return next(err);
  }

  const exposeMessage =
    err instanceof AppError ? err.expose : status < 500 || !isProduction();

  const body = {
    success: false,
    message: message || (exposeMessage ? err.message : 'Internal Server Error')
  };

  if (details) body.errors = details;
  if (status >= 500 && !isProduction() && err.stack) body.stack = err.stack;

  res.status(status).json(body);
};

// API-запросы к несуществующим маршрутам должны получать JSON 404,
// а не молча проваливаться в SPA-фоллбэк с HTML-страницей.
const notFoundHandler = (req, res, next) => {
  next(new AppError(`Маршрут ${req.method} ${req.originalUrl} не найден`, 404));
};

module.exports = errorHandler;
module.exports.errorHandler = errorHandler;
module.exports.notFoundHandler = notFoundHandler;
