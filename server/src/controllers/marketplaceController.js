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
    const { title, name, description, price, category, segment, image, images, seller } = req.body;

    const listing = new Listing({
      seller: req.userId || (seller && seller.match(/^[0-9a-fA-F]{24}$/) ? seller : null),
      title: title || name || 'Без названия',
      description: description || '',
      price: Number(price) || 0,
      category: category || 'electronics',
      segment: segment || 'b2c',
      images: Array.isArray(images) && images.length > 0 
        ? images 
        : (image ? [image] : [])
    });

    await listing.save();

    // Очищаем кеш
    await redisClient.del('listings:all');
    res.status(201).json(listing);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

exports.deleteListing = async (req, res) => {
  try {
    const { id } = req.params;
    const deletedListing = await Listing.findByIdAndDelete(id);

    if (!deletedListing) {
      return res.status(404).json({ message: 'Listing not found' });
    }

    // Очищаем кеш
    await redisClient.del('listings:all');
    res.json({ message: 'Listing deleted successfully', id });
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