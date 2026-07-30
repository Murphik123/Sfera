// ============================================================
// EXPRESS APP
// Путь: server/src/app.js
// ============================================================
const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const path = require('path');
const { authMiddleware } = require('./middleware/auth');
const errorHandler = require('./middleware/errorHandler');

// Импорт маршрутов
const authRoutes = require('./routes/authRoutes');
const chatRoutes = require('./routes/chatRoutes');
const marketplaceRoutes = require('./routes/marketplaceRoutes');
const mailRoutes = require('./routes/mailRoutes');
const bankRoutes = require('./routes/bankRoutes');
const aiRoutes = require('./routes/aiRoutes');
const statsRoutes = require('./routes/statsRoutes');

const app = express();

// Защита заголовков
app.use(helmet());

// CORS
app.use(cors({
  origin: '*',
  credentials: true
}));

// Парсеры
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

// ============================================================
// СТАТИКА - ОТДАЁМ HTML ФАЙЛЫ
// ============================================================
// Пробуем разные варианты
const staticPaths = [
  path.join(__dirname, '../../public'),    // server/../public
  path.join(__dirname, '../public'),       // server/src/../public
  path.join(__dirname, '../../'),          // server/.. (корень проекта)
  path.join(__dirname, '../'),             // server/src/..
  path.join(__dirname, '../../frontend'),  // server/../frontend
];

// Проверяем, какая папка существует и используем её
let staticPath = null;
for (const p of staticPaths) {
  const fs = require('fs');
  if (fs.existsSync(p)) {
    const testFile = path.join(p, 'index.html');
    if (fs.existsSync(testFile)) {
      staticPath = p;
      console.log(`✅ Найдена статическая папка: ${p}`);
      break;
    }
  }
}

if (!staticPath) {
  // Если ничего не нашли, используем корень сервера
  staticPath = path.join(__dirname, '../../');
  console.log(`⚠️ Статическая папка не найдена, использую: ${staticPath}`);
}

app.use(express.static(staticPath));

// ============================================================
// ПУБЛИЧНЫЕ МАРШРУТЫ
// ============================================================
app.use('/api/auth', authRoutes);
app.use('/api/stats', statsRoutes);

// ============================================================
// ЗАЩИЩЁННЫЕ МАРШРУТЫ
// ============================================================
app.use('/api/chat', authMiddleware, chatRoutes);
app.use('/api/marketplace', authMiddleware, marketplaceRoutes);
app.use('/api/mail', authMiddleware, mailRoutes);
app.use('/api/bank', authMiddleware, bankRoutes);
app.use('/api/ai', authMiddleware, aiRoutes);

// ============================================================
// ОБРАБОТКА 404 - Возвращаем index.html для SPA
// ============================================================
app.get('*', (req, res) => {
  const indexPath = path.join(staticPath, 'index.html');
  if (require('fs').existsSync(indexPath)) {
    res.sendFile(indexPath);
  } else {
    res.status(404).json({ message: 'Page not found' });
  }
});

// ============================================================
// ОБРАБОТКА ОШИБОК
// ============================================================
app.use(errorHandler);

module.exports = app;
