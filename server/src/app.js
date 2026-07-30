const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const path = require('path');
const { authMiddleware } = require('./middleware/auth');
const errorHandler = require('./middleware/errorHandler');

// Маршруты
const authRoutes = require('./routes/authRoutes');
const chatRoutes = require('./routes/chatRoutes');
const marketplaceRoutes = require('./routes/marketplaceRoutes');
const mailRoutes = require('./routes/mailRoutes');
const bankRoutes = require('./routes/bankRoutes');
const aiRoutes = require('./routes/aiRoutes');
const statsRoutes = require('./routes/statsRoutes');

const app = express();

// ============================================================
// MIDDLEWARE
// ============================================================
app.use(helmet({
    crossOriginResourcePolicy: { policy: "cross-origin" }
}));

app.use(cors({
    origin: '*',
    credentials: true,
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization']
}));

app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

// ============================================================
// СТАТИКА
// ============================================================
app.use(express.static(path.join(__dirname, '../../public')));

// ============================================================
// API МАРШРУТЫ
// ============================================================
console.log('✅ Регистрация маршрутов:');
console.log('  /api/auth - загружен');
app.use('/api/auth', authRoutes);
console.log('  /api/stats - загружен');
app.use('/api/stats', statsRoutes);
console.log('  /api/chat - загружен (требуется auth)');
app.use('/api/chat', authMiddleware, chatRoutes);
console.log('  /api/marketplace - загружен (требуется auth)');
app.use('/api/marketplace', authMiddleware, marketplaceRoutes);
console.log('  /api/mail - загружен (требуется auth)');
app.use('/api/mail', authMiddleware, mailRoutes);
console.log('  /api/bank - загружен (требуется auth)');
app.use('/api/bank', authMiddleware, bankRoutes);
console.log('  /api/ai - загружен (требуется auth)');
app.use('/api/ai', authMiddleware, aiRoutes);

// ============================================================
// ОБРАБОТКА 404 - ОТДАЁМ index.html ДЛЯ SPA
// ============================================================
app.get('*', (req, res) => {
    const indexPath = path.join(__dirname, '../../public/index.html');
    res.sendFile(indexPath);
});

// ============================================================
// ОБРАБОТКА ОШИБОК
// ============================================================
app.use(errorHandler);

module.exports = app;
