const multer = require('multer');
const path = require('path');
const fs = require('fs');

// Создаем папку uploads в корне проекта, если её нет
const uploadDir = path.join(__dirname, '../../uploads');
try {
  fs.mkdirSync(uploadDir, { recursive: true });
} catch (error) {
  // Падение на этапе require() без контекста выглядит как «маршрут не загрузился»,
  // поэтому обогащаем ошибку путём и причиной.
  throw new Error(`Не удалось создать папку для загрузок ${uploadDir}: ${error.message}`);
}

const storage = multer.diskStorage({
  destination: function (req, file, cb) {
    cb(null, uploadDir);
  },
  filename: function (req, file, cb) {
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1e9);
    const ext = path.extname(file.originalname) || '.jpg';
    cb(null, `listing-${uniqueSuffix}${ext}`);
  }
});

const upload = multer({
  storage: storage,
  limits: { fileSize: 5 * 1024 * 1024 } // Ограничение 5 МБ
});

// MulterError классифицируется в middleware/errorHandler.js (400/413 вместо 500).

module.exports = { upload };
