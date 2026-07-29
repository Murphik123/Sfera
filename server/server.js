const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
const path = require('path');

// Пути к роутам относительно server/server.js (ведут в папку src/routes)
const authRoutes = require('./src/routes/authRoutes');
const chatRoutes = require('./src/routes/chatRoutes');
const marketplaceRoutes = require('./src/routes/marketplaceRoutes');
const mailRoutes = require('./src/routes/mailRoutes');
const bankRoutes = require('./src/routes/bankRoutes');
const aiRoutes = require('./src/routes/aiRoutes');

const app = express();

// Middleware
app.use(cors());
app.use(express.json());

// 1. Маршруты API (подключаются строго до статики)
app.use('/api/auth', authRoutes);
app.use('/api/chat', chatRoutes);
app.use('/api/marketplace', marketplaceRoutes);
app.use('/api/mail', mailRoutes);
app.use('/api/bank', bankRoutes);
app.use('/api/ai', aiRoutes);

// 2. Статические файлы фронтенда (поднимаемся на уровень выше в папку ../public)
app.use(express.static(path.join(__dirname, '../public')));

// 3. Отдача главного файла index.html для всех остальных страниц
app.get('*', (req, res) => {
    res.sendFile(path.join(__dirname, '../public', 'index.html'));
});

// Запуск сервера
const PORT = process.env.PORT || 10000;
const MONGODB_URI = process.env.MONGODB_URI;

if (MONGODB_URI) {
    mongoose.connect(MONGODB_URI)
        .then(() => console.log('MongoDB успешно подключен'))
        .catch(err => console.error('Ошибка подключения к MongoDB:', err));
} else {
    console.warn('ВНИМАНИЕ: MONGODB_URI не задан в переменных окружения');
}

app.listen(PORT, () => {
    console.log(`Сервер запущен на порту ${PORT}`);
});
