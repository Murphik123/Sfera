const express = require('express');
const http = require('http');
const path = require('path');
const cors = require('cors');

const app = express();

// Middleware
app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Подключение REST маршрутов (с явным подключением chatRoutes)
app.use('/api/auth', require('./src/routes/authRoutes'));
app.use('/api/users', require('./src/routes/userRoutes'));
app.use('/api/chat', require('./src/routes/chatRoutes'));
app.use('/api/admin', require('./src/routes/adminRoutes'));
app.use('/api/listings', require('./src/routes/listingRoutes'));
app.use('/api/mail', require('./src/routes/mailRoutes'));
app.use('/api/predictions', require('./src/routes/predictionRoutes'));
app.use('/api/tmpay', require('./src/routes/paymentRoutes'));

// Создание HTTP сервера для Express и Socket.io
const server = http.createServer(app);

// Инициализация WebSocket
const initSocket = require('./serverSocket');
initSocket(server);

// Запуск сервера
const PORT = process.env.PORT || 10000;
server.listen(PORT, () => {
  console.log(`🚀 Server running on port ${PORT}`);
  console.log(`🔌 WebSocket готов`);
});
