require('dotenv').config();
const app = require('./src/app');
const http = require('http');
const socketio = require('socket.io');
const connectDB = require('./src/config/db');
// const redisClient = require('./src/config/redis'); // если используете

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

// Если Redis используется
// redisClient.on('connect', () => console.log('✅ Redis connected'));
// redisClient.on('error', (err) => console.error('❌ Redis error:', err));

// Инициализация Socket.io (если есть)
// require('./src/sockets')(io);

server.listen(PORT, () => {
  console.log(`🚀 Server running on port ${PORT}`);
});
