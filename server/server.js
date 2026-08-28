/* ==========================================================================
   SFERA PLATFORM — MAIN SERVER (Node.js + Express + Socket.io)
   ========================================================================== */

const path = require('path');
const fs = require('fs');
const express = require('express');
const http = require('http');
const cors = require('cors');
const { Server } = require('socket.io');
const { checkQdrantConnection } = require('./src/services/qdrant.service');

// Загрузка .env из корня проекта
require('dotenv').config({ path: path.resolve(__dirname, '../.env') });

const app = express();

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

// Запуск сервера
const PORT = process.env.PORT || 10000;
const HOST = '0.0.0.0';

app.listen(PORT, HOST, () => {
  console.log(`🚀 Server running on http://${HOST}:${PORT}`);
  console.log(`🔌 WebSocket готов`);
  checkQdrantConnection();
});
