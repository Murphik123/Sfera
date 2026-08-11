// src/routes/mailRoutes.js
const express = require('express');
const router = express.Router();
const mailController = require('../controllers/mailController');

// Проверяем, что функция существует перед тем, как привязать её к маршруту
if (mailController.sendMail) {
  router.post('/send', mailController.sendMail);
}

// Заглушка для корневого GET-запроса /api/mail (чтобы не было undefined)
router.get('/', (req, res) => {
  res.status(200).json({ message: 'Модуль почты активен' });
});

module.exports = router;
