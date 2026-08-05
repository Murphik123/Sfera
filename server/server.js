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
  path.join(__dirname, 'src/routes'),      // ./src/routes
  path.join(__dirname, '../routes'),       // ../routes
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
  process.exit(1);
}

console.log(`📁 Найдена папка маршрутов (routes): ${routesDir}`);

// -----------------------------------------------------------------------------
// 2. МИДДЛВАРЫ И РАЗДАЧА СТАТИКИ (ВКЛЮЧАЯ UPLOADS)
// -----------------------------------------------------------------------------
app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

const publicDir = fs.existsSync(path.join(path.dirname(routesDir), 'public'))
  ? path.join(path.dirname(routesDir), 'public')
  : path.join(__dirname, 'public');

app.use(express.static(publicDir));

// Раздача загруженных картинок объявления (локальная папка uploads)
const uploadDir = path.join(__dirname, 'uploads');
if (!fs.existsSync(uploadDir)) {
  fs.mkdirSync(uploadDir, { recursive: true });
}
app.use('/uploads', express.static(uploadDir));

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
// 4. НАСТРОЙКА WEBSOCKET (ЧАТ + P2P ЗВОНКИ WEBRTC)
// -----------------------------------------------------------------------------
const io = new Server(server, {
  cors: {
    origin: '*',
    methods: ['GET', 'POST']
  }
});

io.on('connection', (socket) => {
  console.log(`🔌 Новый WebSocket клиент подключен: ${socket.id}`);

  // Регистрация пользователя в его личной комнате Socket.io
  socket.on('join-user', (userId) => {
    socket.join(userId);
    console.log(`👤 Пользователь ${userId} привязал сокет ${socket.id}`);
  });

  // --- WebRTC P2P Сигналинг для аудио/видео вызовов ---

  // 1. Инициация звонка (Пользователь А -> Пользователю Б)
  socket.on('call-user', ({ userToCall, offer, from }) => {
    io.to(userToCall).emit('incoming-call', { offer, from });
  });

  // 2. Ответ на входящий звонок
  socket.on('answer-call', ({ to, answer }) => {
    io.to(to).emit('call-answered', { answer });
  });

  // 3. Обмен ICE-кандидатами (P2P сетевые маршруты)
  socket.on('ice-candidate', ({ to, candidate }) => {
    io.to(to).emit('ice-candidate', { candidate });
  });

  // 4. Завершение или отклон звонка
  socket.on('end-call', ({ to }) => {
    io.to(to).emit('call-ended');
  });

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
// 5. БЕЗОПАСНЫЙ ИМПОРТ И ПОДКЛЮЧЕНИЕ МАРШРУТОВ (ROUTES)
// -----------------------------------------------------------------------------
const existingFiles = fs.readdirSync(routesDir);

function loadRouteIfExists(endpoint, routeFileName) {
  const matchedFile = existingFiles.find(
    f => f.toLowerCase() === routeFileName.toLowerCase() || 
         f.toLowerCase() === `${routeFileName.toLowerCase()}.js`
  );

  if (matchedFile) {
    const routePath = path.join(routesDir, matchedFile);
    try {
      const importedModule = require(routePath);
      
      // Автоматическое извлечение роутера из любых типов экспорта
      const routerHandler = importedModule.default || importedModule.router || importedModule;

      if (typeof routerHandler === 'function' || (routerHandler && typeof routerHandler.use === 'function')) {
        app.use(endpoint, routerHandler);
        console.log(`✅ Маршрут подключен: ${endpoint} -> ${matchedFile}`);
      } else {
        console.error(`❌ Ошибка в ${matchedFile}: Модуль не экспортирует валидный Express Router.`);
      }
    } catch (err) {
      console.error(`❌ Сбой при загрузке ${matchedFile}:`, err.message);
      console.error(err.stack);
    }
  } else {
    console.warn(`⚠️ Пропущен маршрут ${endpoint}: файл '${routeFileName}.js' не найден в ${routesDir}`);
  }
}

loadRouteIfExists('/api/auth', 'authRoutes');
loadRouteIfExists('/api/users', 'userRoutes');
loadRouteIfExists('/api/listings', 'listingRoutes');
loadRouteIfExists('/api/mail', 'mailRoutes');
loadRouteIfExists('/api/predictions', 'predictionRoutes');
loadRouteIfExists('/api/admin', 'adminRoutes');
loadRouteIfExists('/api/tmpay', 'paymentRoutes');

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
// 7. ЗАПУСК СЕРВЕРА С ЗАЩИТОЙ
// -----------------------------------------------------------------------------
if (require.main === module) {
  server.listen(PORT, '0.0.0.0', () => {
    console.log(`🚀 Server running on port ${PORT}`);
    console.log(`🔌 WebSocket готов`);
  });
}

module.exports = app;
