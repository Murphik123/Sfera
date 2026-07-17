// ============================================================
// СЕРВЕРНАЯ ТОЧКА ВХОДА
// Путь: server/server.js
// ============================================================
require('dotenv').config();
const app = require('./src/app'); // основное Express-приложение
const http = require('http');
const connectDB = require('./src/config/db'); // если есть

const PORT = process.env.PORT || 5000;

const server = http.createServer(app);

// Подключение к MongoDB (если в app.js не вызывается)
connectDB();

// Если используете Socket.io – раскомментируйте:
// const socketio = require('socket.io');
// const io = socketio(server, { cors: { origin: '*' } });
// require('./src/sockets')(io);

server.listen(PORT, () => {
  console.log(`🚀 Server running on port ${PORT}`);
  console.log(`   Health: /ping`);
  console.log(`   Stats: /api/stats`);
});
