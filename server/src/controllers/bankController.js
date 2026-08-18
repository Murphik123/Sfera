// src/controllers/bankController.js
const Account = require('../models/Account');
const Transaction = require('../models/Transaction');

const asyncHandler = require('../utils/asyncHandler');
const { ApiError } = require('../utils/apiError');
const { parsePositiveAmount } = require('../utils/validation');
const { getOrCreateAccount } = require('../utils/balances');

// ============================================================
// ПОЛУЧЕНИЕ БАЛАНСА (с авто-созданием, если счета нет)
// ============================================================
exports.getBalance = asyncHandler(async (req, res) => {
    const account = await getOrCreateAccount(req.userId);
    res.json({ balance: account.balance, currency: account.currency });
}, { message: 'Ошибка получения баланса' });

// ============================================================
// ПЕРЕВОД СРЕДСТВ (Атомарный безопасный вариант)
// ============================================================
exports.transfer = asyncHandler(async (req, res) => {
    const { toUserId, amount, description } = req.body;
    const transferAmount = parsePositiveAmount(amount, 'Сумма перевода должна быть больше нуля');

    if (req.userId.toString() === toUserId.toString()) {
        throw ApiError.badRequest('Нельзя перевести средства самому себе');
    }

    // 1. Атомарно списываем средства с проверкой наличия нужного баланса
    const fromAccount = await Account.findOneAndUpdate(
        { userId: req.userId, balance: { $gte: transferAmount } },
        { $inc: { balance: -transferAmount } },
        { new: true }
    );

    if (!fromAccount) {
        throw ApiError.badRequest('Недостаточно средств или счет не найден');
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
}, { message: 'Ошибка при выполнении перевода', logLabel: '❌ Transfer error' });

// ============================================================
// ИСТОРИЯ ТРАНЗАКЦИЙ
// ============================================================
exports.getTransactions = asyncHandler(async (req, res) => {
    const account = await Account.findOne({ userId: req.userId });
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
}, { message: 'Ошибка получения историй транзакций' });
