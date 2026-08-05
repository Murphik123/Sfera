const cloudinary = require('cloudinary').v2;
const { CloudinaryStorage } = require('multer-storage-cloudinary');
const multer = require('multer');

// Конфигурация Cloudinary (берёт переменные из .env)
cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET
});

// Настройка хранилища для Multer
const storage = new CloudinaryStorage({
  cloudinary: cloudinary,
  params: {
    folder: 'sfera/listings', // Папка в Cloudinary
    allowed_formats: ['jpg', 'jpeg', 'png', 'webp'],
    transformation: [{ width: 1200, height: 1200, crop: 'limit' }]
  }
});

// Ограничение: максимум 5 файлов по 5MB
const upload = multer({
  storage: storage,
  limits: { fileSize: 5 * 1024 * 1024 }
});

module.exports = { cloudinary, upload };
