const Account = require('../models/Account');
const Transaction = require('../models/Transaction');

exports.getBalance = async (req, res) => {
  try {
    const account = await Account.findOne({ userId: req.userId });
    if (!account) return res.status(404).json({ message: 'Account not found' });
    res.json({ balance: account.balance, currency: account.currency });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

exports.transfer = async (req, res) => {
  try {
    const { toUserId, amount, description } = req.body;
    if (amount <= 0) return res.status(400).json({ message: 'Amount must be positive' });

    const fromAccount = await Account.findOne({ userId: req.userId });
    const toAccount = await Account.findOne({ userId: toUserId });

    if (!fromAccount || !toAccount) {
      return res.status(404).json({ message: 'Account not found' });
    }

    if (fromAccount.balance < amount) {
      return res.status(400).json({ message: 'Insufficient balance' });
    }

    // Выполняем перевод (можно обернуть в транзакцию MongoDB)
    fromAccount.balance -= amount;
    toAccount.balance += amount;
    await fromAccount.save();
    await toAccount.save();

    const transaction = new Transaction({
      fromAccount: fromAccount._id,
      toAccount: toAccount._id,
      amount,
      type: 'transfer',
      description,
      status: 'completed'
    });
    await transaction.save();

    res.json({ message: 'Transfer successful', transaction });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

exports.getTransactions = async (req, res) => {
  try {
    const account = await Account.findOne({ userId: req.userId });
    if (!account) return res.status(404).json({ message: 'Account not found' });

    const transactions = await Transaction.find({
      $or: [{ fromAccount: account._id }, { toAccount: account._id }]
    }).sort({ createdAt: -1 });

    res.json(transactions);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};
