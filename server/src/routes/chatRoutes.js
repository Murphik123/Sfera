// routes/chatRoutes.js
const router = require('express').Router();
const { sendMessage, getMessages, markAsRead } = require('../controllers/chatController');

// Существующие маршруты
router.post('/send', sendMessage);
router.get('/:userId', getMessages);
router.put('/read/:messageId', markAsRead);

// ✅ НОВЫЙ МАРШРУТ: список диалогов текущего пользователя
router.get('/dialogs', async (req, res) => {
  try {
    // Здесь должна быть логика получения диалогов из БД.
    // Пока возвращаем тестовые данные, чтобы фронтенд заработал.
    const dialogs = [
      { id: '1', name: 'Aýdar', lastMessage: 'Salam!', time: new Date(), unread: 2 },
      { id: '2', name: 'Meret', lastMessage: 'Nähili?', time: new Date(Date.now() - 3600000), unread: 0 },
      { id: '3', name: 'Gülşat', lastMessage: 'Gepleşeliň!', time: new Date(Date.now() - 7200000), unread: 5 },
      { id: '4', name: 'Saparmyrat', lastMessage: 'Habar bar', time: new Date(Date.now() - 86400000), unread: 0 },
    ];
    res.json(dialogs);
  } catch (error) {
    console.error('Ошибка получения диалогов:', error);
    res.status(500).json({ message: 'Ошибка сервера' });
  }
});

module.exports = router;
