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

// ========== ОБЪЯВЛЕНИЕ app ==========
const app = express();

// Защита заголовков
app.use(helmet());

// CORS
app.use(cors({
  origin: '*',
  credentials: true
}));

// Парсеры
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

// Статика (фронтенд) – если запускаем из одной папки
app.use(express.static(path.join(__dirname, '../../public')));

// ============================================================
// ПУБЛИЧНЫЕ МАРШРУТЫ
// ============================================================
app.use('/api/auth', authRoutes);
app.use('/api/stats', statsRoutes);

// ============================================================
// ЗАЩИЩЁННЫЕ МАРШРУТЫ (требуют аутентификации)
// ============================================================
app.use('/api/chat', authMiddleware, chatRoutes);
app.use('/api/marketplace', authMiddleware, marketplaceRoutes);
app.use('/api/mail', authMiddleware, mailRoutes);
app.use('/api/bank', authMiddleware, bankRoutes);
app.use('/api/ai', authMiddleware, aiRoutes);

// ============================================================
// ТЕСТОВЫЙ МАРШРУТ
// ============================================================
app.get('/ping', (req, res) => {
  res.json({ status: 'ok', time: new Date().toISOString() });
});

// ============================================================
// ОБРАБОТКА 404 (должна быть ПОСЛЕ всех маршрутов)
// ============================================================
app.use((req, res) => {
  res.status(404).json({ error: 'Not Found' });
});

// ============================================================
// SPA FALLBACK – отдаём index.html для всех неизвестных маршрутов
// (Должен быть ПОСЛЕ обработки 404 и ПОСЛЕ всех API-маршрутов)
// ============================================================
app.get('*', (req, res) => {
  res.sendFile(path.join(__dirname, '../../public/index.html'));
});

// ============================================================
// ОБРАБОТКА ОШИБОК (всегда в конце)
// ============================================================
app.use(errorHandler);

module.exports = app;
