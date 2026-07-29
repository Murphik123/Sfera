const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const path = require('path');
require('dotenv').config();

const app = express();

// Middlewares
app.use(cors());
app.use(helmet());
app.use(express.json());

// Статика (для frontend)
app.use(express.static(path.join(__dirname, '../public')));

// Подключение маршрутов
app.use('/api/auth', require('./routes/authRoutes'));
app.use('/api/admin', require('./routes/adminRoutes'));   // ← обязательно

// Health check
app.get('/ping', (req, res) => {
    res.json({ status: 'ok' });
});

// Обработка 404
app.use((req, res) => {
    res.status(404).json({ message: 'Not found' });
});

// Обработка ошибок
app.use((err, req, res, next) => {
    console.error(err.stack);
    res.status(500).json({ message: err.message || 'Internal server error' });
});

module.exports = app;
