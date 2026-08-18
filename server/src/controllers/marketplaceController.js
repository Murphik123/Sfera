const Listing = require('../models/Listing');
const Order = require('../models/Order');

const asyncHandler = require('../utils/asyncHandler');
const cache = require('../utils/cache');

const LISTINGS_CACHE_KEY = 'listings:all';
const LISTINGS_CACHE_TTL = 60 * 5; // 5 min

exports.getListings = asyncHandler(async (req, res) => {
    const listings = await cache.remember(LISTINGS_CACHE_KEY, LISTINGS_CACHE_TTL, () =>
        Listing.find({ status: 'active' }).populate('seller', 'username avatar')
    );
    res.json(listings);
}, { format: 'error' });

exports.createListing = asyncHandler(async (req, res) => {
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

    await cache.forget(LISTINGS_CACHE_KEY);
    res.status(201).json(listing);
}, { format: 'error' });

exports.createOrder = asyncHandler(async (req, res) => {
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

    await cache.forget(LISTINGS_CACHE_KEY);

    res.status(201).json(order);
}, { format: 'error' });
