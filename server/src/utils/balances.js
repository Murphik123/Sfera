const Wallet = require('../models/Wallet');
const Account = require('../models/Account');

/**
 * Имя поля баланса в кошельке по коду валюты.
 */
const resolveBalanceField = (currency) => (currency === 'TM_COIN' ? 'tmCoinBalance' : 'balance');

/**
 * Кошелёк TM Pay пользователя; создаётся при первом обращении.
 *
 * @param {string} userId
 * @param {Object} [options]
 * @param {import('mongoose').ClientSession} [options.session] - транзакционная сессия
 * @param {boolean} [options.persist=true] - сохранять новый кошелёк сразу
 */
const getOrCreateWallet = async (userId, { session, persist = true } = {}) => {
    const query = Wallet.findOne({ userId });
    if (session) query.session(session);

    const existing = await query;
    if (existing) return existing;

    const wallet = new Wallet({ userId });
    if (persist) await wallet.save(session ? { session } : undefined);
    return wallet;
};

/**
 * Банковский счёт пользователя; создаётся при первом обращении.
 */
const getOrCreateAccount = async (userId) => {
    const existing = await Account.findOne({ userId });
    if (existing) return existing;
    return Account.create({ userId, balance: 0 });
};

module.exports = { resolveBalanceField, getOrCreateWallet, getOrCreateAccount };
