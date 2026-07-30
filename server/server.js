const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
const path = require('path');

const app = express();

// 1. Мидлвары
app.use(cors());
app.use(express.json());

// 2. Импортируем роуты из папки src/routes/
const authRoutes = require('./src/routes/authRoutes');
const chatRoutes = require('./src/routes/chatRoutes');
const marketplaceRoutes = require('./src/routes/marketplaceRoutes');
const mailRoutes = require('./src/routes/mailRoutes');
const bankRoutes = require('./src/routes/bankRoutes');
const aiRoutes = require('./src/routes/aiRoutes');

// 3. Подключаем API маршруты (ОБЯЗАТЕЛЬНО ДО СТАТИКИ)
app.use('/api/auth', authRoutes);
app.use('/api/chat', chatRoutes);
app.use('/api/marketplace', marketplaceRoutes);
app.use('/api/mail', mailRoutes);
app.use('/api/bank', bankRoutes);
app.use('/api/ai', aiRoutes);

// 4. Статика из папки public (на уровень выше папки server)
app.use(express.static(path.join(__dirname, '../public')));

app.get('*', (req, res) => {
    res.sendFile(path.join(__dirname, '../public', 'index.html'));
});

// 5. Запуск
const PORT = process.env.PORT || 10000;
const MONGODB_URI = process.env.MONGODB_URI;

if (MONGODB_URI) {
    mongoose.connect(MONGODB_URI)
        .then(() => console.log('MongoDB подключен'))
        .catch(err => console.error('Ошибка БД:', err));
}

// ===== ВРЕМЕННЫЙ СКРИПТ УДАЛЁН =====

app.listen(PORT, () => {
    console.log(`Сервер запущен на порту ${PORT}`);
});
