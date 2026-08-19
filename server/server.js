require('dotenv').config();
const express = require('express');
const path = require('path');
const fs = require('fs');
const { checkQdrantConnection } = require('./src/services/qdrant.service');

const app = express();
const PORT = process.env.PORT || 10000;

app.use(express.json());

// Раздача статической папки
const publicPath = path.join(__dirname, '../public');
console.log(`📂 Раздача статики из папки: ${publicPath}`);
app.use(express.static(publicPath));

// Автоматическое подключение всех файлов маршрутов из src/routes
const routesPath = path.join(__dirname, 'src/routes');
if (fs.existsSync(routesPath)) {
  console.log(`📁 Найдена папка маршрутов (routes): ${routesPath}`);
  fs.readdirSync(routesPath).forEach((file) => {
    if (file.endsWith('.js')) {
      const routeName = file.replace('Routes.js', '').replace('.js', '');
      app.use(`/api/${routeName}`, require(`./src/routes/${file}`));
      console.log(`✅ Маршрут подключен: /api/${routeName} -> ${file}`);
    }
  });
}

app.listen(PORT, async () => {
  console.log(`🚀 Server running on http://0.0.0.0:${PORT}`);
  await checkQdrantConnection();
});