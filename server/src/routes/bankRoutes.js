const router = require('express').Router();
const { getBalance, transfer, getTransactions } = require('../controllers/bankController');

router.get('/balance', getBalance);
router.post('/transfer', transfer);
router.get('/transactions', getTransactions);

module.exports = router;
