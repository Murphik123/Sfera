// ============================================================
// СЕРВЕРНАЯ ЧАСТЬ (обновлённая)
// Путь: server/server.js
// ============================================================
require('dotenv').config();
const express = require('express');
const cors = require('cors');
const mongoose = require('mongoose');

const app = express();
const PORT = process.env.PORT || 5000;

// ============================================================
// НАСТРОЙКА CORS (разрешаем только ваш фронтенд)
// ============================================================
const allowedOrigins = [
  'https://sfera-ot4f.onrender.com',
  'http://localhost:3000', // для локальной разработки (если нужно)
  'http://localhost:5000'
];

app.use(cors({
  origin: function (origin, callback) {
    // Если origin не передан (например, запрос с сервера) или разрешён – пропускаем
    if (!origin || allowedOrigins.indexOf(origin) !== -1) {
      callback(null, true);
    } else {
      callback(new Error('Not allowed by CORS'));
    }
  },
  credentials: true
}));

// ============================================================
// ПАРСЕРЫ
// ============================================================
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

// ============================================================
// ПОДКЛЮЧЕНИЕ К MONGODB
// ============================================================
if (process.env.MONGODB_URI) {
  mongoose.connect(process.env.MONGODB_URI)
    .then(() => console.log('✅ MongoDB connected'))
    .catch(err => console.error('❌ MongoDB error:', err));
} else {
  console.log('⚠️ MONGODB_URI not set, skipping database connection');
}

// ============================================================
// МАРШРУТЫ
// ============================================================

// 1. Проверка работоспособности сервера
app.get('/ping', (req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

// 2. Состояние сервера (health)
app.get('/api/health', (req, res) => {
  res.json({ status: 'OK', message: 'Server is running' });
});

// 3. Статистика для фронтенда (заглушка)
app.get('/api/stats', (req, res) => {
  res.json({
    online: 1842,
    users: 2340000,
    orders: 18540291,
    docs: 11328901,
    coin: 21000000
  });
});

// 4. Обработка OPTIONS-запросов (для CORS)
app.options('*', cors()); // автоматически обрабатывает предварительные запросы

// 5. Обработка 404 (если маршрут не найден)
app.use((req, res) => {
  res.status(404).json({ error: 'Not Found' });
});

// ============================================================
// ЗАПУСК СЕРВЕРА
// ============================================================
app.listen(PORT, () => {
  console.log(`🚀 Server running on port ${PORT}`);
  console.log(`   Health check: /ping`);
  console.log(`   Stats: /api/stats`);
});
