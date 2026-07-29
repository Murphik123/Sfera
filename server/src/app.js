const express = require('express');
const cors = require('cors');
const path = require('path');

const authRoutes = require('./routes/authRoutes');

const app = express();

// Middleware
app.use(cors({ origin: '*' }));
app.use(express.json());

// API Маршруты
app.use('/api/auth', authRoutes);

// Статические файлы из папки public (корневая папка)
app.use(express.static(path.join(__dirname, '../../public')));

// SPA Перенаправление для остальных GET запросов
app.get('*', (req, res) => {
  res.sendFile(path.join(__dirname, '../../public/index.html'));
});

// ГЛОБАЛЬНЫЙ ОБРАБОТЧИК ОШИБОК: Запрещает Express возвращать HTML 500
app.use((err, req, res, next) => {
  console.error('Критическая ошибка сервера:', err);
  res.status(err.status || 500).json({
    message: err.message || 'Внутренняя ошибка сервера'
  });
});

module.exports = app;
