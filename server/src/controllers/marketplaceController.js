const Listing = require('../models/Listing');
const Order = require('../models/Order');
const redisClient = require('../config/redis');

exports.getListings = async (req, res) => {
  try {
    const cacheKey = 'listings:all';
    const cached = await redisClient.get(cacheKey);
    if (cached) {
      return res.json(JSON.parse(cached));
    }

    const listings = await Listing.find({ status: 'active' }).populate('seller', 'username avatar');
    await redisClient.set(cacheKey, JSON.stringify(listings), 'EX', 60 * 5); // 5 min
    res.json(listings);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

exports.createListing = async (req, res) => {
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
    await redisClient.del('listings:all');
    res.status(201).json(listing);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

exports.createOrder = async (req, res) => {
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
    await redisClient.del('listings:all');

    res.status(201).json(order);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};
