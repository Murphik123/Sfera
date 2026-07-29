const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const path = require('path');
require('dotenv').config();

const app = express();

// Middlewares
app.use(cors());
app.use(helmet({
    contentSecurityPolicy: false // Отключаем жесткий CSP для работы встроенных SVG и внешних шрифтов
}));
app.use(express.json());

// Статика (исправленный путь к папке public в корне проекта)
const publicPath = path.join(__dirname, '../../public');
app.use(express.static(publicPath));

// Маршруты API
app.use('/api/auth', require('./routes/authRoutes'));

// Health check
app.get('/ping', (req, res) => {
    res.json({ status: 'ok' });
});

// Перенаправление всех остальных GET запросов на статические HTML файлы
app.get('*', (req, res, next) => {
    if (req.path.startsWith('/api/')) return next();
    res.sendFile(path.join(publicPath, req.path.endsWith('.html') ? req.path : 'index.html'), (err) => {
        if (err) {
            res.status(404).json({ message: 'Page not found' });
        }
    });
});

// 404 для API
app.use((req, res) => {
    res.status(404).json({ message: 'API route not found' });
});

// Обработка ошибок (гарантирует отпуск ответ в формате JSON)
app.use((err, req, res, next) => {
    console.error('Server Error:', err.stack);
    res.status(500).json({ message: err.message || 'Internal server error' });
});

module.exports = app;
