// ============================================================
// СЕРВЕРНАЯ ТОЧКА ВХОДА
// Путь: server/server.js
// ============================================================
require('dotenv').config();
const app = require('./src/app');
const http = require('http');
const socketio = require('socket.io');
const connectDB = require('./src/config/db');
const redisClient = require('./src/config/redis');

const PORT = process.env.PORT || 5000;

const server = http.createServer(app);
const io = socketio(server, {
  cors: {
    origin: '*',
    methods: ['GET', 'POST']
  }
});

// Подключение к MongoDB
connectDB();

// Подключение к Redis
redisClient.on('connect', () => console.log('✅ Redis connected'));
redisClient.on('error', (err) => console.error('❌ Redis error:', err));

// Инициализация Socket.io (обработчики событий)
require('./src/sockets')(io);

// Запуск сервера
server.listen(PORT, () => {
  console.log(`🚀 Server running on http://localhost:${PORT}`);
});
