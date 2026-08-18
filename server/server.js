require('dotenv').config();
const express = require('express');
const path = require('path');
const { checkQdrantConnection } = require('./src/services/qdrant.service');

const app = express();
const PORT = process.env.PORT || 3000;

app.use(express.json());
app.use(express.static(path.join(__dirname, '../public')));

// Подключение маршрутов
app.use('/api/search', require('./src/routes/searchRoutes'));

app.listen(PORT, async () => {
  console.log(`🚀 Сервер запущен на порту ${PORT}`);
  await checkQdrantConnection();
});
