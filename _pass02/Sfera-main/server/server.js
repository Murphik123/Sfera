/* ==========================================================================
   SFERA PLATFORM — MAIN SERVER (Node.js + Express + Socket.io)
   ========================================================================== */

const path = require('path');
const fs = require('fs');
const http = require('http');
const express = require('express');
const cors = require('cors');
const connectDB = require('./src/config/db');
const initSocket = require('./src/sockets');

require('dotenv').config({ path: path.resolve(__dirname, '../.env') });

const app = express();
const httpServer = http.createServer(app);

app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(express.static(path.join(__dirname, '../public')));

// Shared HTTP application reference for future Core integration.
app.set('httpServer', httpServer);

const routesDir = path.join(__dirname, 'src/routes');

if (fs.existsSync(routesDir)) {
  console.log(`📁 Найдена папка маршрутов (routes): ${routesDir}`);
  const files = fs.readdirSync(routesDir).filter((file) => file.endsWith('.js'));

  for (const file of files) {
    const routeName = file.replace(/Routes\.js$|\.js$/, '').toLowerCase();
    const routePath = `/api/${routeName}`;
    const fullFilePath = path.join(routesDir, file);

    try {
      const routeModule = require(fullFilePath);
      app.use(routePath, routeModule);
      console.log(`✅ Маршрут подключен: ${routePath} -> ${file}`);
    } catch (err) {
      console.error(`❌ Ошибка загрузки маршрута ${file}:`, err);
      throw err;
    }
  }
}

app.get('/api/health', (req, res) => {
  res.json({
    success: true,
    status: 'ok',
    uptime: Math.floor(process.uptime()),
    websocket: true
  });
});

app.use('/api', (req, res, next) => {
  if (req.method === 'GET' && !res.headersSent) {
    return res.status(404).json({ success: false, error: 'API endpoint not found' });
  }
  next();
});

const io = initSocket(httpServer);
app.set('io', io);

const PORT = process.env.PORT || 10000;
const HOST = '0.0.0.0';

async function startServer() {
  try {
    await connectDB();

    httpServer.listen(PORT, HOST, () => {
      console.log(`🚀 Server running on http://${HOST}:${PORT}`);
      console.log('🔌 Socket.IO gateway ready');
    });
  } catch (error) {
    console.error('❌ Server startup failed:', error);
    process.exit(1);
  }
}

startServer();

module.exports = { app, httpServer, io };
