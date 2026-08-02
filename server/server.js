// server.js
require('dotenv').config();
const app = require('./src/app');
const http = require('http');
const connectDB = require('./src/config/db');
const redisClient = require('./src/config/redis');

const PORT = process.env.PORT || 5000;
const server = http.createServer(app);

// Подключение к MongoDB
connectDB();

// Подключение к Redis (если используется)
if (redisClient) {
  redisClient.on('connect', () => console.log('✅ Redis connected'));
  redisClient.on('error', (err) => console.error('❌ Redis error:', err));
}

// Инициализация Socket.IO (передаём сервер)
const setupSocket = require('./src/sockets');
const io = setupSocket(server);
app.set('io', io); // делаем io доступным в других модулях

// Запуск сервера
server.listen(PORT, () => {
  console.log(`🚀 Server running on http://localhost:${PORT}`);
  console.log(`🔌 WebSocket готов`);
});
