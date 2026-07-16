const router = require('express').Router();
const { sendMail, getInbox, getOutbox, markAsRead } = require('../controllers/mailController');

router.post('/send', sendMail);
router.get('/inbox', getInbox);
router.get('/outbox', getOutbox);
router.put('/read/:mailId', markAsRead);

module.exports = router;
