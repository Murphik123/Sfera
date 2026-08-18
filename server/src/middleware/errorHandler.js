const errorHandler = (err, req, res, next) => {
  console.error('❌ Error:', err.stack);

  const status = err.status || 500;
  // Внутренние ошибки не раскрываем клиенту: детали остаются в логах сервера.
  const message = status >= 500 ? 'Internal Server Error' : (err.message || 'Request error');

  res.status(status).json({ message });
};

module.exports = errorHandler;
