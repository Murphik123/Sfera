const Wallet = require('../models/Wallet');
const Transaction = require('../models/Transaction');

const asyncHandler = require('../utils/asyncHandler');
const withTransaction = require('../utils/withTransaction');
const { ApiError } = require('../utils/apiError');
const { paginate, paginatedResponse } = require('../utils/pagination');
const { parsePositiveAmount } = require('../utils/validation');
const { resolveBalanceField, getOrCreateWallet } = require('../utils/balances');

// Получение или создание кошелька
exports.getWallet = asyncHandler(async (req, res) => {
    const wallet = await getOrCreateWallet(req.user._id);
    res.json(wallet);
});

// Безопасный перевод средств (TMT или TM Coin)
exports.transfer = asyncHandler(async (req, res) => {
    const { recipientId, amount, currency = 'TMT', description } = req.body;
    const senderId = req.user._id;

    if (senderId.toString() === recipientId) {
        throw ApiError.badRequest('Нельзя перевести средства самому себе');
    }

    const transferAmount = parsePositiveAmount(amount, 'Сумма перевода должна быть больше 0');
    const balanceField = resolveBalanceField(currency);

    const transaction = await withTransaction(async (session) => {
        // 1. Проверяем баланс отправителя
        const senderWallet = await Wallet.findOne({ userId: senderId }).session(session);
        if (!senderWallet || senderWallet[balanceField] < transferAmount) {
            throw ApiError.badRequest('Недостаточно средств на балансе');
        }

        // 2. Получаем/создаем кошелек получателя
        const recipientWallet = await getOrCreateWallet(recipientId, { session, persist: false });

        // 3. Обновляем балансы
        senderWallet[balanceField] -= transferAmount;
        recipientWallet[balanceField] += transferAmount;

        await senderWallet.save({ session });
        await recipientWallet.save({ session });

        // 4. Фиксируем транзакцию
        const record = new Transaction({
            sender: senderId,
            recipient: recipientId,
            amount: transferAmount,
            currency,
            type: 'transfer',
            status: 'completed',
            description: description || 'Внутренний перевод'
        });

        await record.save({ session });
        return record;
    });

    res.json({ message: 'Перевод успешно выполнен', transaction });
});

// Пополнение баланса (Депозит)
exports.deposit = asyncHandler(async (req, res) => {
    const { amount, currency = 'TMT' } = req.body;
    const depositAmount = parsePositiveAmount(amount, 'Сумма пополнения должна быть больше 0');
    const balanceField = resolveBalanceField(currency);

    const wallet = await getOrCreateWallet(req.user._id, { persist: false });
    wallet[balanceField] += depositAmount;
    await wallet.save();

    const transaction = await Transaction.create({
        sender: null,
        recipient: req.user._id,
        amount: depositAmount,
        currency,
        type: 'deposit',
        status: 'completed',
        description: 'Пополнение баланса TM Pay'
    });

    res.json({ message: 'Баланс успешно пополнен', wallet, transaction });
});

// История транзакций пользователя
exports.getMyTransactions = asyncHandler(async (req, res) => {
    const filter = {
        $or: [
            { sender: req.user._id },
            { recipient: req.user._id }
        ]
    };

    const result = await paginate(Transaction, filter, {
        query: req.query,
        populate: [['sender', 'username email'], ['recipient', 'username email']]
    });

    res.json(paginatedResponse('transactions', result));
});
