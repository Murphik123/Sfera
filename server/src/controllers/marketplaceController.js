const Listing = require('../models/Listing');
const Order = require('../models/Order');
const redisClient = require('../config/redis');
const { logSuppressedError } = require('../utils/errors');

const CACHE_KEY = 'listings:all';

// Кеш — оптимизация, а не источник истины: его сбои логируются,
// но не ломают запрос и не теряются молча.
const readCache = async (key) => {
  try {
    const cached = await redisClient.get(key);
    return cached ? JSON.parse(cached) : null;
  } catch (error) {
    logSuppressedError(`Не удалось прочитать кеш ${key}`, error);
    return null;
  }
};

const writeCache = async (key, value, ttlSeconds) => {
  try {
    await redisClient.set(key, JSON.stringify(value), 'EX', ttlSeconds);
  } catch (error) {
    logSuppressedError(`Не удалось записать кеш ${key}`, error);
  }
};

const dropCache = async (key) => {
  try {
    await redisClient.del(key);
  } catch (error) {
    logSuppressedError(`Не удалось сбросить кеш ${key}`, error);
  }
};

exports.getListings = async (req, res, next) => {
  try {
    const cached = await readCache(CACHE_KEY);
    if (cached) {
      return res.json(cached);
    }

    const listings = await Listing.find({ status: 'active' }).populate('seller', 'username avatar');
    await writeCache(CACHE_KEY, listings, 60 * 5); // 5 min
    res.json(listings);
  } catch (error) {
    return next(error);
  }
};

exports.createListing = async (req, res, next) => {
  try {
    const { title, description, price, category, images } = req.body;
    const listing = new Listing({
      seller: req.userId,
      title,
      description,
      price,
      category,
      images
    });
    await listing.save();

    // Очищаем кеш
    await dropCache(CACHE_KEY);
    res.status(201).json(listing);
  } catch (error) {
    return next(error);
  }
};

exports.createOrder = async (req, res, next) => {
  try {
    const { listingId } = req.body;
    const listing = await Listing.findById(listingId);
    if (!listing) return res.status(404).json({ message: 'Listing not found' });

    if (listing.status !== 'active') {
      return res.status(400).json({ message: 'Listing not available' });
    }

    const order = new Order({
      listing: listingId,
      buyer: req.userId,
      seller: listing.seller,
      amount: listing.price
    });
    await order.save();

    // Обновляем статус объявления
    listing.status = 'sold';
    await listing.save();

    // Очищаем кеш
    await dropCache(CACHE_KEY);

    res.status(201).json(order);
  } catch (error) {
    return next(error);
  }
};
