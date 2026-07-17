// ============================================================
// EXPRESS APP
// Путь: server/src/app.js
// ============================================================
const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const path = require('path');
const { authMiddleware } = require('./middleware/auth');
const errorHandler = require('./middleware/errorHandler');

// Импорт маршрутов
const authRoutes = require('./routes/authRoutes');
const chatRoutes = require('./routes/chatRoutes');
const marketplaceRoutes = require('./routes/marketplaceRoutes');
const mailRoutes = require('./routes/mailRoutes');
const bankRoutes = require('./routes/bankRoutes');
const aiRoutes = require('./routes/aiRoutes');
const statsRoutes = require('./routes/statsRoutes');

const app = express();

// Защита заголовков
app.use(helmet());

// CORS
app.use(cors({
  origin: '*', // для разработки
  credentials: true
}));

// Парсеры
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

// Статика (фронтенд)
app.use(express.static(path.join(__dirname, '../../public')));

// ============================================================
// ПУБЛИЧНЫЕ МАРШРУТЫ
// ============================================================
app.use('/api/auth', authRoutes);
app.use('/api/stats', statsRoutes); // публичная статистика

// ============================================================
// ЗАЩИЩЁННЫЕ МАРШРУТЫ (требуют аутентификации)
// ============================================================
app.use('/api/chat', authMiddleware, chatRoutes);
app.use('/api/marketplace', authMiddleware, marketplaceRoutes);
app.use('/api/mail', authMiddleware, mailRoutes);
app.use('/api/bank', authMiddleware, bankRoutes);
app.use('/api/ai', authMiddleware, aiRoutes);

// ============================================================
// ТЕСТОВЫЙ МАРШРУТ (можно оставить)
// ============================================================
app.get('/ping', (req, res) => {
  res.json({ status: 'ok', time: new Date().toISOString() });
});

// ============================================================
// ОБРАБОТКА ОШИБОК
// ============================================================
app.use(errorHandler);

// ============================================================
// ОТДАЧА index.html ДЛЯ ЛЮБОГО ДРУГОГО МАРШРУТА (SPA)
// ============================================================
app.get('*', (req, res) => {
  res.sendFile(path.join(__dirname, '../../public/index.html'));
});

module.exports = app;
