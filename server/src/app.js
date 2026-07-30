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

// Middleware
app.use(helmet());
app.use(cors({ origin: '*', credentials: true }));
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

// СТАТИКА - ОТДАЁМ ФАЙЛЫ ИЗ public/
app.use(express.static(path.join(__dirname, '../../public')));

// API МАРШРУТЫ
app.use('/api/auth', authRoutes);
app.use('/api/stats', statsRoutes);
app.use('/api/chat', authMiddleware, chatRoutes);
app.use('/api/marketplace', authMiddleware, marketplaceRoutes);
app.use('/api/mail', authMiddleware, mailRoutes);
app.use('/api/bank', authMiddleware, bankRoutes);
app.use('/api/ai', authMiddleware, aiRoutes);

// ОБРАБОТКА 404 - ОТДАЁМ index.html
app.get('*', (req, res) => {
  res.sendFile(path.join(__dirname, '../../public/index.html'));
});

app.use(errorHandler);

module.exports = app;
