// src/app.js
const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const path = require('path');
const fs = require('fs');
const { authMiddleware } = require('./middleware/auth');
const { adminAuth } = require('./middleware/adminAuth');
const errorHandler = require('./middleware/errorHandler');

const authRoutes = require('./routes/authRoutes');
const userRoutes = require('./routes/userRoutes');
const chatRoutes = require('./routes/chatRoutes');
const marketplaceRoutes = require('./routes/marketplaceRoutes');
const listingRoutes = require('./routes/listingRoutes');
const mailRoutes = require('./routes/mailRoutes');
const bankRoutes = require('./routes/bankRoutes');
const paymentRoutes = require('./routes/paymentRoutes');
const aiRoutes = require('./routes/aiRoutes');
const predictionRoutes = require('./routes/predictionRoutes');
const statsRoutes = require('./routes/statsRoutes');
const adminRoutes = require('./routes/adminRoutes');

const app = express();

// Список разрешённых origin (CORS_ORIGINS="https://a.tm,https://b.tm").
const allowedOrigins = (process.env.CORS_ORIGINS || '')
  .split(',')
  .map((origin) => origin.trim())
  .filter(Boolean);

app.use(helmet({
  contentSecurityPolicy: {
    directives: {
      defaultSrc: ["'self'"],
      scriptSrc: ["'self'", "'unsafe-inline'"],
      styleSrc: ["'self'", "'unsafe-inline'", "https://fonts.googleapis.com"],
      fontSrc: ["'self'", "https://fonts.gstatic.com"],
      imgSrc: ["'self'", "data:", "https:"],
      connectSrc: ["'self'", ...allowedOrigins]
    },
  },
  crossOriginResourcePolicy: { policy: "same-site" }
}));

app.use(cors({
  origin: (origin, callback) => {
    // Запросы без Origin (same-origin, мобильные клиенты, curl) разрешены.
    // Неразрешённый origin: отвечаем без CORS-заголовков, браузер сам заблокирует ответ.
    callback(null, !origin || allowedOrigins.includes(origin));
  },
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization']
}));

app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

// 1. Раздача статики (проверяем обе возможные структуры папок: ../public и ../../public)
const publicPaths = [
  path.resolve(__dirname, '../public'),
  path.resolve(__dirname, '../../public'),
  path.resolve(process.cwd(), 'public')
].filter((candidate) => fs.existsSync(candidate));

publicPaths.forEach((publicPath) => app.use(express.static(publicPath)));

// 2. API маршруты. Всё, кроме публичных разделов, закрыто аутентификацией.
app.use('/api/auth', authRoutes);
app.use('/api/stats', statsRoutes);
app.use('/api/listings', listingRoutes); // авторизация задана внутри роутера
app.use('/api/predictions', predictionRoutes);
app.use('/api/users', authMiddleware, userRoutes);
app.use('/api/chat', authMiddleware, chatRoutes);
app.use('/api/marketplace', authMiddleware, marketplaceRoutes);
app.use('/api/mail', authMiddleware, mailRoutes);
app.use('/api/bank', authMiddleware, bankRoutes);
app.use('/api/tmpay', authMiddleware, paymentRoutes);
app.use('/api/ai', authMiddleware, aiRoutes);
app.use('/api/admin', adminAuth, adminRoutes);

// 3. Fallback для SPA
app.get('*', (req, res) => {
  if (path.extname(req.path)) {
    return res.status(404).type('text/plain').send('File not found');
  }

  const indexPath = publicPaths
    .map((publicPath) => path.join(publicPath, 'index.html'))
    .find((candidate) => fs.existsSync(candidate));

  if (!indexPath) {
    return res.status(404).send('Index page not found. Check public folder structure.');
  }

  res.sendFile(indexPath);
});

app.use(errorHandler);

module.exports = app;
