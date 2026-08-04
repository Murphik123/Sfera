const express = require('express');
const router = express.Router();
const paymentController = require('../controllers/paymentController');
const { protect } = require('../middleware/authMiddleware'); // Укажи название твоего auth middleware

router.use(protect);

router.get('/wallet', paymentController.getWallet);
router.post('/transfer', paymentController.transfer);
router.post('/deposit', paymentController.deposit);
router.get('/transactions', paymentController.getMyTransactions);

module.exports = router;
