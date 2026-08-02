// server.js
const { createServer } = require('http');
const app = require('./app');
const setupSocket = require('./sockets');

const PORT = process.env.PORT || 5000;

// Создаём HTTP-сервер из приложения Express
const server = createServer(app);

// Подключаем Socket.IO
const io = setupSocket(server);

// Запускаем сервер
server.listen(PORT, () => {
  console.log(`🚀 Сервер запущен на порту ${PORT}`);
  console.log(`🔌 WebSocket готов к подключениям`);
});

// Обработка ошибок
server.on('error', (err) => {
  console.error('❌ Ошибка сервера:', err);
});
