const mongoose = require('mongoose');
const Listing = require('../models/Listing');
const Order = require('../models/Order');
const redisClient = require('../config/redis');
const Account = require('../models/Account');
const Wallet = require('../models/Wallet');
const Transaction = require('../models/Transaction');

const VALID_SEGMENTS = new Set(['b2c', 'b2b', 'b2g']);
const MAX_IMAGES = 10;

function normalizeImages(images, image) {
  const source = Array.isArray(images) ? images : (image ? [image] : []);
  return source
    .map((item) => typeof item === 'string' ? { url: item } : item)
    .filter((item) => item && typeof item.url === 'string' && item.url.trim())
    .slice(0, MAX_IMAGES)
    .map((item) => ({ url: item.url.trim(), ...(item.public_id ? { public_id: String(item.public_id) } : {}) }));
}

async function clearListingsCache() {
  try {
    await redisClient.del('listings:all');
  } catch (err) {
    console.warn('[Marketplace] Cache invalidation skipped:', err.message);
  }
}

exports.getListings = async (req, res) => {
  try {
    const cacheKey = 'listings:all';
    const cached = await redisClient.get(cacheKey);
    if (cached) return res.json(JSON.parse(cached));

    const listings = await Listing.find({ status: 'active' })
      .populate('seller', 'username avatar')
      .sort({ createdAt: -1 })
      .lean();

    await redisClient.set(cacheKey, JSON.stringify(listings), 'EX', 60 * 5);
    return res.json(listings);
  } catch (error) {
    console.error('[Marketplace] getListings:', error);
    return res.status(500).json({ message: 'Не удалось загрузить каталог', error: error.message });
  }
};

exports.createListing = async (req, res) => {
  try {
    if (!req.userId || !mongoose.isValidObjectId(req.userId)) {
      return res.status(401).json({ message: 'Требуется авторизация' });
    }

    const { title, name, description, price, category, segment, image, images, currency } = req.body || {};
    const normalizedTitle = String(title || name || '').trim();
    const normalizedPrice = Number(price);
    const normalizedSegment = segment || 'b2c';

    if (!normalizedTitle) return res.status(400).json({ message: 'Укажите название товара/услуги' });
    if (!Number.isFinite(normalizedPrice) || normalizedPrice < 0) {
      return res.status(400).json({ message: 'Цена должна быть неотрицательным числом' });
    }
    if (!VALID_SEGMENTS.has(normalizedSegment)) {
      return res.status(400).json({ message: 'Недопустимый сегмент' });
    }

    const listing = new Listing({
      // Seller is always taken from the verified JWT user. Never trust a client-supplied seller id/name.
      seller: req.userId,
      title: normalizedTitle,
      description: String(description || '').trim(),
      price: normalizedPrice,
      currency: currency || 'TMT',
      category: String(category || 'other').trim(),
      segment: normalizedSegment,
      images: normalizeImages(images, image)
    });

    await listing.save();
    await clearListingsCache();

    const result = await Listing.findById(listing._id).populate('seller', 'username avatar').lean();
    return res.status(201).json(result);
  } catch (error) {
    console.error('[Marketplace] createListing:', error);
    return res.status(error.name === 'ValidationError' ? 400 : 500).json({
      message: error.name === 'ValidationError' ? 'Некорректные данные товара' : 'Не удалось создать товар',
      error: error.message
    });
  }
};

exports.deleteListing = async (req, res) => {
  try {
    const { id } = req.params;
    if (!mongoose.isValidObjectId(id)) return res.status(400).json({ message: 'Некорректный ID товара' });

    const listing = await Listing.findById(id);
    if (!listing) return res.status(404).json({ message: 'Listing not found' });

    const isOwner = String(listing.seller) === String(req.userId);
    const isAdmin = req.user?.role === 'admin';
    if (!isOwner && !isAdmin) return res.status(403).json({ message: 'Нет прав на удаление товара' });

    await Listing.findByIdAndDelete(id);
    await clearListingsCache();
    return res.json({ message: 'Listing deleted successfully', id });
  } catch (error) {
    console.error('[Marketplace] deleteListing:', error);
    return res.status(500).json({ message: 'Не удалось удалить товар', error: error.message });
  }
};

exports.createOrder = async (req, res) => {
  try {
    const { listingId } = req.body || {};
    if (!mongoose.isValidObjectId(listingId)) return res.status(400).json({ message: 'Некорректный ID товара' });

    // Atomic transition prevents two buyers from purchasing the same active listing.
    const listing = await Listing.findOneAndUpdate(
      { _id: listingId, status: 'active' },
      { $set: { status: 'sold' } },
      { new: true }
    );

    if (!listing) {
      const existing = await Listing.findById(listingId).select('status seller');
      if (!existing) return res.status(404).json({ message: 'Listing not found' });
      return res.status(409).json({ message: 'Listing not available' });
    }

    if (String(listing.seller) === String(req.userId)) {
      listing.status = 'active';
      await listing.save();
      return res.status(400).json({ message: 'Нельзя купить собственный товар' });
    }

    try {
      const order = await Order.create({
        listing: listing._id,
        buyer: req.userId,
        seller: listing.seller,
        amount: listing.price,
        currency: listing.currency || 'TMT'
      });

      await clearListingsCache();
      return res.status(201).json(order);
    } catch (orderError) {
      // Restore availability if order creation fails.
      await Listing.findByIdAndUpdate(listing._id, { $set: { status: 'active' } });
      throw orderError;
    }
  } catch (error) {
    console.error('[Marketplace] createOrder:', error);
    return res.status(error.name === 'ValidationError' ? 400 : 500).json({
      message: 'Не удалось оформить заказ',
      error: error.message
    });
  }
};


/**
 * Pay an existing marketplace order through an explicit financial rail.
 *
 * rail=bank   -> SFERA Digital Bank Account (TMT only)
 * rail=tm_pay -> TM Pay Wallet (TMT only)
 * rail=tm_coin -> TM Coin balance in Wallet (TM_COIN only)
 *
 * Marketplace never mints funds and never changes a user's balance through the
 * browser. The operation is atomic and creates a marketplace ledger record.
 */
exports.payOrder = async (req, res) => {
  const session = await mongoose.startSession();
  try {
    const { id } = req.params;
    const rail = String(req.body?.rail || 'bank').toLowerCase();
    if (!mongoose.isValidObjectId(id)) return res.status(400).json({ message: 'Некорректный ID заказа' });
    if (!['bank', 'tm_pay', 'tm_coin'].includes(rail)) return res.status(400).json({ message: 'Недопустимый способ оплаты' });

    session.startTransaction();

    const order = await Order.findOne({ _id: id, buyer: req.userId }).session(session);
    if (!order) throw Object.assign(new Error('Заказ не найден'), { status: 404 });
    if (order.status === 'paid' || order.status === 'payment_processing') {
      throw Object.assign(new Error('Заказ уже обрабатывается или оплачен'), { status: 409 });
    }
    if (order.status !== 'pending') throw Object.assign(new Error('Заказ недоступен для оплаты'), { status: 409 });

    const currency = order.currency || 'TMT';
    if ((rail === 'bank' || rail === 'tm_pay') && currency !== 'TMT') {
      throw Object.assign(new Error(`${rail === 'bank' ? 'TM Bank' : 'TM Pay'} поддерживает оплату Marketplace только в TMT`), { status: 400 });
    }
    if (rail === 'tm_coin' && currency !== 'TM_COIN') {
      throw Object.assign(new Error('TM Coin поддерживает оплату Marketplace только в TM_COIN'), { status: 400 });
    }

    // Claim the order inside the same transaction to prevent double payment.
    const claimed = await Order.findOneAndUpdate(
      { _id: order._id, buyer: req.userId, status: 'pending' },
      { $set: { status: 'payment_processing' } },
      { new: true, session }
    );
    if (!claimed) throw Object.assign(new Error('Заказ уже обрабатывается'), { status: 409 });

    const amount = Math.round(Number(order.amount) * 100) / 100;
    if (!Number.isFinite(amount) || amount <= 0) throw Object.assign(new Error('Некорректная сумма заказа'), { status: 400 });

    let debitBalance;
    let creditBalance;
    let railTransaction;

    if (rail === 'bank') {
      const buyerAccount = await Account.findOne({ userId: req.userId, status: 'active', currency: 'TMT' }).session(session);
      const sellerAccount = await Account.findOne({ userId: order.seller, status: 'active', currency: 'TMT' }).session(session);
      if (!buyerAccount) throw Object.assign(new Error('Банковский счёт покупателя недоступен'), { status: 403 });
      if (!sellerAccount) throw Object.assign(new Error('Банковский счёт продавца недоступен'), { status: 403 });

      const debited = await Account.findOneAndUpdate(
        { _id: buyerAccount._id, status: 'active', balance: { $gte: amount } },
        { $inc: { balance: -amount } },
        { new: true, session }
      );
      if (!debited) throw Object.assign(new Error('Недостаточно средств на банковском счёте'), { status: 400 });

      const credited = await Account.findOneAndUpdate(
        { _id: sellerAccount._id, status: 'active' },
        { $inc: { balance: amount } },
        { new: true, session }
      );
      if (!credited) throw Object.assign(new Error('Банковский счёт продавца недоступен'), { status: 403 });

      debitBalance = Number(debited.balance);
      creditBalance = Number(credited.balance);
    } else if (rail === 'tm_pay' || rail === 'tm_coin') {
      const balanceField = rail === 'tm_coin' ? 'tmCoinBalance' : 'balance';
      const insufficientMessage = rail === 'tm_coin' ? 'Недостаточно TM Coin' : 'Недостаточно средств TM Pay';
      const buyerWallet = await Wallet.findOne({ userId: req.userId, isActive: true }).session(session);
      let sellerWallet = await Wallet.findOne({ userId: order.seller, isActive: true }).session(session);
      if (!buyerWallet) throw Object.assign(new Error('Кошелёк покупателя недоступен'), { status: 403 });
      if (!sellerWallet) sellerWallet = new Wallet({ userId: order.seller, isActive: true });

      const debited = await Wallet.findOneAndUpdate(
        { _id: buyerWallet._id, isActive: true, [balanceField]: { $gte: amount } },
        { $inc: { [balanceField]: -amount } },
        { new: true, session }
      );
      if (!debited) throw Object.assign(new Error(insufficientMessage), { status: 400 });

      const credited = await Wallet.findOneAndUpdate(
        { _id: sellerWallet._id, isActive: true },
        { $inc: { [balanceField]: amount } },
        { new: true, upsert: true, setDefaultsOnInsert: true, session }
      );
      if (!credited) throw Object.assign(new Error('Кошелёк продавца недоступен'), { status: 403 });

      debitBalance = Number(debited[balanceField] || 0);
      creditBalance = Number(credited[balanceField] || 0);
    }

    const tx = await Transaction.create([{
      sender: req.userId,
      recipient: order.seller,
      amount,
      currency,
      type: 'payment',
      status: 'completed',
      ledger: 'marketplace',
      relatedListing: order.listing,
      description: `Marketplace order ${order._id}`
    }], { session });
    railTransaction = tx[0];

    claimed.status = 'paid';
    claimed.paymentDetails = {
      rail,
      currency,
      transactionId: railTransaction._id,
      paidAt: new Date()
    };
    await claimed.save({ session });

    await session.commitTransaction();
    await clearListingsCache();

    const io = req.app.get('io');
    if (io) {
      io.to(String(req.userId)).emit('marketplace_payment_completed', {
        orderId: claimed._id,
        rail,
        currency,
        amount,
        balance: debitBalance
      });
      io.to(String(order.seller)).emit('marketplace_payment_received', {
        orderId: claimed._id,
        rail,
        currency,
        amount,
        balance: creditBalance
      });
    }

    return res.status(200).json({
      success: true,
      data: { order: claimed, transaction: railTransaction, balance: debitBalance, currency }
    });
  } catch (error) {
    if (session.inTransaction()) await session.abortTransaction();
    console.error('[Marketplace] payOrder:', error);
    return res.status(error.status || 500).json({ message: error.message || 'Не удалось оплатить заказ' });
  } finally {
    await session.endSession();
  }
};
