// src/controllers/bankController.js
const Account = require('../models/Account');
const Transaction = require('../models/Transaction');
const { isValidObjectId } = require('../utils/validators');

// ============================================================
// ПОЛУЧЕНИЕ БАЛАНСА (с авто-созданием, если счета нет)
// ============================================================
exports.getBalance = async (req, res) => {
  try {
    let account = await Account.findOne({ userId: req.userId });
    
    // Если счет не найден — создаем новый с 0 балансом
    if (!account) {
      account = await Account.create({ userId: req.userId, balance: 0 });
    }

    res.json({ balance: account.balance, currency: account.currency });
  } catch (error) {
    res.status(500).json({ message: 'Ошибка получения баланса' });
  }
};

// ============================================================
// ПЕРЕВОД СРЕДСТВ (Атомарный безопасный вариант)
// ============================================================
exports.transfer = async (req, res) => {
  try {
    const { toUserId, amount, description } = req.body;
    const transferAmount = Number(amount);

    if (!isValidObjectId(toUserId)) {
      return res.status(400).json({ message: 'Некорректный получатель перевода' });
    }

    if (!Number.isFinite(transferAmount) || transferAmount <= 0) {
      return res.status(400).json({ message: 'Сумма перевода должна быть больше нуля' });
    }

    if (req.userId.toString() === toUserId.toString()) {
      return res.status(400).json({ message: 'Нельзя перевести средства самому себе' });
    }

    // 1. Атомарно списываем средства с проверкой наличия нужного баланса
    const fromAccount = await Account.findOneAndUpdate(
      { userId: req.userId, balance: { $gte: transferAmount } },
      { $inc: { balance: -transferAmount } },
      { new: true }
    );

    if (!fromAccount) {
      return res.status(400).json({ message: 'Недостаточно средств или счет не найден' });
    }

    // 2. Пополняем счет получателю (или создаем счет, если у получателя его еще нет)
    const toAccount = await Account.findOneAndUpdate(
      { userId: toUserId },
      { $inc: { balance: transferAmount } },
      { new: true, upsert: true }
    );

    // 3. Фиксируем транзакцию
    const transaction = new Transaction({
      fromAccount: fromAccount._id,
      toAccount: toAccount._id,
      amount: transferAmount,
      type: 'transfer',
      description: description || 'Перевод внутри системы SFERA',
      status: 'completed'
    });
    await transaction.save();

    // 4. Оповещаем получателя в реальном времени через Socket.io
    const io = req.app.get('io');
    if (io) {
      io.to(toUserId.toString()).emit('balance_updated', {
        newBalance: toAccount.balance,
        received: transferAmount
      });
    }

    res.json({ 
      message: 'Перевод успешно выполнен', 
      newBalance: fromAccount.balance, 
      transaction 
    });

  } catch (error) {
    console.error('❌ Transfer error:', error);
    res.status(500).json({ message: 'Ошибка при выполнении перевода' });
  }
};

// ============================================================
// ИСТОРИЯ ТРАНЗАКЦИЙ
// ============================================================
exports.getTransactions = async (req, res) => {
  try {
    let account = await Account.findOne({ userId: req.userId });
    if (!account) {
      return res.json([]);
    }

    const transactions = await Transaction.find({
      $or: [{ fromAccount: account._id }, { toAccount: account._id }]
    })
    .populate({
      path: 'fromAccount',
      populate: { path: 'userId', select: 'username email avatar' }
    })
    .populate({
      path: 'toAccount',
      populate: { path: 'userId', select: 'username email avatar' }
    })
    .sort({ createdAt: -1 });

    res.json(transactions);
  } catch (error) {
    res.status(500).json({ message: 'Ошибка получения историй транзакций' });
  }
};
