const path = require('path');
const fs = require('fs');
const express = require('express');
const cors = require('cors');

// Загрузка .env из корня проекта
require('dotenv').config({ path: path.resolve(__dirname, '../.env') });

const app = express();
const PORT = process.env.PORT || 10000;

app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(express.static(path.join(__dirname, '../public')));

// 1. Динамическое авто-подключение всех маршрутов из src/routes
const routesDir = path.join(__dirname, 'src/routes');

if (fs.existsSync(routesDir)) {
  console.log(`📁 Найдена папка маршрутов (routes): ${routesDir}`);
  const files = fs.readdirSync(routesDir);

  files.forEach((file) => {
    if (file.endsWith('.js')) {
      // Превращаем adminRoutes.js -> /api/admin
      const routeName = file.replace(/Routes\.js$|\.js$/, '').toLowerCase();
      const routePath = `/api/${routeName}`;
      const fullFilePath = path.join(routesDir, file);

      try {
        const routeModule = require(fullFilePath);
        app.use(routePath, routeModule);
        console.log(`✅ Маршрут подключен: ${routePath} -> ${file}`);
      } catch (err) {
        console.error(`❌ Ошибка загрузки маршрута ${file}:`, err.message);
      }
    }
  });
}

// Healthcheck
app.get('/api/health', (req, res) => {
  res.json({ success: true, status: 'ok', uptime: Math.floor(process.uptime()) });
});

// 2. Проверка подключения к Qdrant при старте
async function checkQdrant() {
  const qdrantUrl = process.env.QDRANT_URL;
  const apiKey = process.env.QDRANT_API_KEY;

  if (!qdrantUrl) return;

  try {
    const { fetch: undiciFetch } = require('undici');
    const headers = { 'Content-Type': 'application/json' };
    if (apiKey) headers['api-key'] = apiKey;

    const res = await undiciFetch(`${qdrantUrl}/collections`, { headers });
    const data = await res.json();

    if (data.result && Array.isArray(data.result.collections)) {
      console.log(`✅ Qdrant подключен (коллекций: ${data.result.collections.length})`);
    }
  } catch (err) {
    console.log(`⚠️ Qdrant недоступен: ${err.message}`);
  }
}

// Запуск сервера
app.listen(PORT, '0.0.0.0', async () => {
  console.log(`🚀 Server running on http://0.0.0.0:${PORT}`);
  await checkQdrant();
});