const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
const path = require('path');

const authRoutes = require('./routes/authRoutes');

const app = express();

// 1. Middleware (парсинг JSON и CORS)
app.use(cors());
app.use(express.json());

// 2. Маршруты API (ОБЯЗАТЕЛЬНО ДО СТАТИКИ)
app.use('/api/auth', authRoutes);

// 3. Отдача статических файлов фронтенда из папки public
app.use(express.static(path.join(__dirname, 'public')));

// 4. Перенаправление всех остальных GET-запросов на index.html (для SPA / роутинга)
app.get('*', (req, res) => {
    res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

// 5. Подключение к MongoDB и запуск сервера
const PORT = process.env.PORT || 10000;
const MONGODB_URI = process.env.MONGODB_URI;

if (MONGODB_URI) {
    mongoose.connect(MONGODB_URI)
        .then(() => console.log('MongoDB успешно подключен'))
        .catch(err => console.error('Ошибка подключения к MongoDB:', err));
} else {
    console.warn('ВНИМАНИЕ: Переменная MONGODB_URI не задана!');
}

app.listen(PORT, () => {
    console.log(`Сервер запущен на порту ${PORT}`);
});
