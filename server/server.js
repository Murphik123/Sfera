require('dotenv').config();
const express = require('express');
const http = require('http');
const path = require('path');
const cors = require('cors');
const mongoose = require('mongoose');
const { Server } = require('socket.io');
const redis = require('redis');

// Инициализация Express приложения и HTTP сервера
const app = express();
const server = http.createServer(app);

// -----------------------------------------------------------------------------
// 1. МИДДЛВАРЫ И РАЗДАЧА СТАТИКИ
// -----------------------------------------------------------------------------
app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Раздача статических файлов out of public
app.use(express.static(path.join(__dirname, '../public')));

// -----------------------------------------------------------------------------
// 2. ИНИЦИАЛИЗАЦИЯ И ПОДКЛЮЧЕНИЕ БАЗ ДАННЫХ
// -----------------------------------------------------------------------------
const PORT = process.env.PORT || 10000;
const MONGO_URI = process.env.MONGO_URI || 'mongodb://localhost:27017/sfera';
const REDIS_URL = process.env.REDIS_URL || 'redis://localhost:6379';

// Подключение к MongoDB
mongoose.connect(MONGO_URI)
  .then((conn) => console.log(`✅ MongoDB connected: ${conn.connection.host}`))
  .catch((err) => console.error(`❌ MongoDB connection error: ${err.message}`));

// Подключение к Redis
const redisClient = redis.createClient({ url: REDIS_URL });
redisClient.on('error', (err) => console.error('❌ Redis Error:', err));
redisClient.connect()
  .then(() => console.log('✅ Redis connected'))
  .catch((err) => console.error('❌ Redis connection error:', err));

// -----------------------------------------------------------------------------
// 3. НАСТРОЙКА WEBSOCKET
// -----------------------------------------------------------------------------
const io = new Server(server, {
  cors: {
    origin: '*',
    methods: ['GET', 'POST']
  }
});

io.on('connection', (socket) => {
  console.log(`🔌 Новый WebSocket клиент подключен: ${socket.id}`);

  socket.on('disconnect', () => {
    console.log(`🔌 Клиент отключился: ${socket.id}`);
  });
});

// Прокидываем io и redis в req для доступа из контроллеров
app.use((req, res, next) => {
  req.io = io;
  req.redis = redisClient;
  next();
});

// -----------------------------------------------------------------------------
// 4. ИМПОРТ И ПОДКЛЮЧЕНИЕ МАРШРУТОВ (ROUTES)
// -----------------------------------------------------------------------------
const authRoutes = require('../routes/authRoutes');
const userRoutes = require('../routes/userRoutes');
const listingRoutes = require('../routes/listingRoutes');
const mailRoutes = require('../routes/mailRoutes');
const predictionRoutes = require('../routes/predictionRoutes');
const adminRoutes = require('../routes/adminRoutes');
const paymentRoutes = require('../routes/paymentRoutes');

app.use('/api/auth', authRoutes);
app.use('/api/users', userRoutes);
app.use('/api/listings', listingRoutes);
app.use('/api/mail', mailRoutes);
app.use('/api/predictions', predictionRoutes);
app.use('/api/admin', adminRoutes);
app.use('/api/tmpay', paymentRoutes);

// -----------------------------------------------------------------------------
// 5. ГЛАВНЫЕ СТРАНИЦЫ И ОБРАБОТКА ОШИБОК
// -----------------------------------------------------------------------------
app.get('*', (req, res, next) => {
  if (req.path.startsWith('/api')) {
    return next();
  }
  res.sendFile(path.join(__dirname, '../public', 'index.html'));
});

app.use('/api/*', (req, res) => {
  res.status(404).json({ message: 'API эндпоинт не найден' });
});

app.use((err, req, res, next) => {
  console.error('Unhandled Error:', err);
  res.status(err.status || 500).json({
    message: err.message || 'Внутренняя ошибка сервера'
  });
});

// -----------------------------------------------------------------------------
// 6. ЗАПУСК СЕРВЕРА
// -----------------------------------------------------------------------------
server.listen(PORT, () => {
  console.log(`🚀 Server running on http://localhost:${PORT}`);
  console.log(`🔌 WebSocket готов`);
});
