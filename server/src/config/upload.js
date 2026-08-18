const multer = require('multer');
const fs = require('fs');
const path = require('path');

// Создаем папку uploads в корне проекта, если её нет
const uploadDir = path.join(__dirname, '../../uploads');
if (!fs.existsSync(uploadDir)) {
  fs.mkdirSync(uploadDir, { recursive: true });
}

// Разрешаем только растровые картинки: SVG/HTML в раздаваемой папке давали бы XSS.
const ALLOWED_MIME_TYPES = new Map([
  ['image/jpeg', '.jpg'],
  ['image/png', '.png'],
  ['image/webp', '.webp'],
  ['image/gif', '.gif']
]);

const storage = multer.diskStorage({
  destination: function (req, file, cb) {
    cb(null, uploadDir);
  },
  filename: function (req, file, cb) {
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1e9);
    // Имя файла генерируется сервером, расширение — из белого списка MIME-типов,
    // чтобы исключить path traversal и двойные расширения из originalname.
    const ext = ALLOWED_MIME_TYPES.get(file.mimetype) || '.jpg';
    cb(null, `listing-${uniqueSuffix}${ext}`);
  }
});

const upload = multer({
  storage: storage,
  limits: { fileSize: 5 * 1024 * 1024, files: 5 }, // Ограничение 5 МБ
  fileFilter: (req, file, cb) => {
    if (!ALLOWED_MIME_TYPES.has(file.mimetype)) {
      return cb(new Error('Допустимы только изображения JPEG, PNG, WebP или GIF'));
    }
    cb(null, true);
  }
});

module.exports = { upload };
