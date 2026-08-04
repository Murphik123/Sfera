require('dotenv').config();
const express = require('express');
const http = require('http');
const path = require('path');
const fs = require('fs');
const cors = require('cors');
const mongoose = require('mongoose');
const { Server } = require('socket.io');
const redis = require('redis');

const app = express();
const server = http.createServer(app);

// -----------------------------------------------------------------------------
// 1. ДИНАМИЧЕСКИЙ ПОИСК БАЗОВОЙ ДИРЕКТОРИИ (Маршрутов и Статики)
// -----------------------------------------------------------------------------
const possiblePaths = [
  path.join(__dirname, 'routes'),          // ./routes
  path.join(__dirname, '../routes'),       // ../routes
  path.join(__dirname, 'src/routes'),      // ./src/routes
  path.join(__dirname, '../src/routes')    // ../src/routes
];

let routesDir = null;
for (const p of possiblePaths) {
  if (fs.existsSync(p)) {
    routesDir = p;
    break;
  }
}

if (!routesDir) {
  console.error('❌ Критическая ошибка: Папка routes не найдена в файловой системе!');
  console.error('Текущая директория __dirname:', __dirname);
  console.error('Содержимое текущей директории:', fs.readdirSync(__dirname));
  process.exit(1);
}

console.log(`📁 Найдена папка маршрутов (routes): ${routesDir}`);

// -----------------------------------------------------------------------------
// 2. МИДДЛВАРЫ И РАЗДАЧА СТАТИКИ
// -----------------------------------------------------------------------------
app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Определяем путь к папке public относительно найденной структуры
const publicDir = fs.existsSync(path.join(path.dirname(routesDir), 'public'))
  ? path.join(path.dirname(routesDir), 'public')
  : path.join(__dirname, 'public');

app.use(express.static(publicDir));

// -----------------------------------------------------------------------------
// 3. ИНИЦИАЛИЗАЦИЯ И ПОДКЛЮЧЕНИЕ БАЗ ДАННЫХ
// -----------------------------------------------------------------------------
const PORT = process.env.PORT || 10000;
const MONGO_URI = process.env.MONGO_URI || 'mongodb://localhost:27017/sfera';
const REDIS_URL = process.env.REDIS_URL || 'redis://localhost:6379';

mongoose.connect(MONGO_URI)
  .then((conn) => console.log(`✅ MongoDB connected: ${conn.connection.host}`))
  .catch((err) => console.error(`❌ MongoDB connection error: ${err.message}`));

const redisClient = redis.createClient({ url: REDIS_URL });
redisClient.on('error', (err) => console.error('❌ Redis Error:', err));
redisClient.connect()
  .then(() => console.log('✅ Redis connected'))
  .catch((err) => console.error('❌ Redis connection error:', err));

// -----------------------------------------------------------------------------
// 4. НАСТРОЙКА WEBSOCKET
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

app.use((req, res, next) => {
  req.io = io;
  req.redis = redisClient;
  next();
});

// -----------------------------------------------------------------------------
// 5. ИМПОРТ И ПОДКЛЮЧЕНИЕ МАРШРУТОВ (ROUTES)
// -----------------------------------------------------------------------------
const authRoutes = require(path.join(routesDir, 'authRoutes'));
const userRoutes = require(path.join(routesDir, 'userRoutes'));
const listingRoutes = require(path.join(routesDir, 'listingRoutes'));
const mailRoutes = require(path.join(routesDir, 'mailRoutes'));
const predictionRoutes = require(path.join(routesDir, 'predictionRoutes'));
const adminRoutes = require(path.join(routesDir, 'adminRoutes'));
const paymentRoutes = require(path.join(routesDir, 'paymentRoutes'));

app.use('/api/auth', authRoutes);
app.use('/api/users', userRoutes);
app.use('/api/listings', listingRoutes);
app.use('/api/mail', mailRoutes);
app.use('/api/predictions', predictionRoutes);
app.use('/api/admin', adminRoutes);
app.use('/api/tmpay', paymentRoutes);

// -----------------------------------------------------------------------------
// 6. ГЛАВНЫЕ СТРАНИЦЫ И ОБРАБОТКА ОШИБОК
// -----------------------------------------------------------------------------
app.get('*', (req, res, next) => {
  if (req.path.startsWith('/api')) {
    return next();
  }
  const indexPath = path.join(publicDir, 'index.html');
  if (fs.existsSync(indexPath)) {
    return res.sendFile(indexPath);
  }
  res.status(404).send('Index page not found');
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
// 7. ЗАПУСК СЕРВЕРА
// -----------------------------------------------------------------------------
server.listen(PORT, () => {
  console.log(`🚀 Server running on http://localhost:${PORT}`);
  console.log(`🔌 WebSocket готов`);
});
