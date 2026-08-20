const path = require('path');
require('dotenv').config({ path: path.resolve(__dirname, '../.env') });
const express = require('express');
const cors = require('cors');

const app = express();
const PORT = process.env.PORT || 10000;

// Middleware
app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Подключение роутов
const searchRoutes = require('./src/routes/searchRoutes');
app.use('/api/search', searchRoutes);

// Проверка статуса сервера
app.get('/', (req, res) => {
  res.json({ success: true, message: 'Backend Sfera работает' });
});

// Обработка 404
app.use((req, res) => {
  res.status(404).json({ success: false, message: 'Маршрут не найден' });
});

// Запуск сервера
app.listen(PORT, () => {
  console.log(`🚀 Сервер запущен на http://localhost:${PORT}`);
});