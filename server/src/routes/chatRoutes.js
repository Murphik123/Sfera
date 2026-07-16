const router = require('express').Router();
const { sendMessage, getMessages, markAsRead } = require('../controllers/chatController');

router.post('/send', sendMessage);
router.get('/:userId', getMessages);
router.put('/read/:messageId', markAsRead);

module.exports = router;
