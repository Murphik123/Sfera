const Listing = require('../models/Listing');
const { isValidObjectId, asString, pick } = require('../utils/validators');

const LISTING_UPDATABLE_FIELDS = ['title', 'description', 'price', 'currency', 'category', 'location', 'images'];

exports.getListings = async (req, res) => {
  try {
    const page = Math.max(parseInt(req.query.page, 10) || 1, 1);
    const limit = Math.min(Math.max(parseInt(req.query.limit, 10) || 10, 1), 100);
    const category = asString(req.query.category);
    const search = asString(req.query.search);
    const minPrice = Number(req.query.minPrice);
    const maxPrice = Number(req.query.maxPrice);

    const query = { status: asString(req.query.status) || 'active' };

    if (category) query.category = category;
    if (!Number.isNaN(minPrice) || !Number.isNaN(maxPrice)) {
      query.price = {};
      if (!Number.isNaN(minPrice)) query.price.$gte = minPrice;
      if (!Number.isNaN(maxPrice)) query.price.$lte = maxPrice;
    }
    if (search) query.$text = { $search: search };

    const listings = await Listing.find(query)
      .populate('seller', 'name email avatar')
      .sort({ createdAt: -1 })
      .skip((page - 1) * limit)
      .limit(limit);

    const total = await Listing.countDocuments(query);

    res.status(200).json({
      success: true,
      count: listings.length,
      total,
      totalPages: Math.ceil(total / limit),
      currentPage: page,
      data: listings
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

exports.getListingById = async (req, res) => {
  try {
    if (!isValidObjectId(req.params.id)) {
      return res.status(400).json({ success: false, message: 'Некорректный идентификатор объявления' });
    }

    const listing = await Listing.findByIdAndUpdate(
      req.params.id,
      { $inc: { viewsCount: 1 } },
      { new: true }
    ).populate('seller', 'name email avatar phone');

    if (!listing) {
      return res.status(404).json({ success: false, message: 'Объявление не найдено' });
    }

    res.status(200).json({ success: true, data: listing });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

exports.createListing = async (req, res) => {
  try {
    const { title, description, price, currency, category, location } = req.body;

    let parsedLocation = location;
    if (typeof location === 'string') {
      try {
        parsedLocation = JSON.parse(location);
      } catch (e) {
        parsedLocation = {};
      }
    }

    // Собираем ссылки на загруженные локально картинки
    let images = [];
    if (req.files && req.files.length > 0) {
      const protocol = req.headers['x-forwarded-proto'] || req.protocol;
      const host = req.get('host');
      
      images = req.files.map((file) => ({
        url: `${protocol}://${host}/uploads/${file.filename}`,
        public_id: file.filename
      }));
    }

    const listing = await Listing.create({
      title,
      description,
      price,
      currency,
      category,
      images,
      location: parsedLocation,
      seller: req.user._id
    });

    res.status(201).json({ success: true, data: listing });
  } catch (error) {
    res.status(400).json({ success: false, message: error.message });
  }
};

exports.updateListing = async (req, res) => {
  try {
    if (!isValidObjectId(req.params.id)) {
      return res.status(400).json({ success: false, message: 'Некорректный идентификатор объявления' });
    }

    let listing = await Listing.findById(req.params.id);

    if (!listing) {
      return res.status(404).json({ success: false, message: 'Объявление не найдено' });
    }

    if (listing.seller.toString() !== req.user._id.toString() && req.user.role !== 'admin') {
      return res.status(403).json({ success: false, message: 'Нет прав на редактирование' });
    }

    // Обновляем только разрешённые поля: seller, status и счётчики
    // не должны меняться из тела запроса.
    const updates = pick(req.body, LISTING_UPDATABLE_FIELDS);

    if (req.files && req.files.length > 0) {
      const protocol = req.headers['x-forwarded-proto'] || req.protocol;
      const host = req.get('host');
      const newImages = req.files.map((file) => ({
        url: `${protocol}://${host}/uploads/${file.filename}`,
        public_id: file.filename
      }));
      updates.images = [...listing.images, ...newImages];
    }

    listing = await Listing.findByIdAndUpdate(req.params.id, updates, {
      new: true,
      runValidators: true
    });

    res.status(200).json({ success: true, data: listing });
  } catch (error) {
    res.status(400).json({ success: false, message: error.message });
  }
};

exports.deleteListing = async (req, res) => {
  try {
    if (!isValidObjectId(req.params.id)) {
      return res.status(400).json({ success: false, message: 'Некорректный идентификатор объявления' });
    }

    const listing = await Listing.findById(req.params.id);

    if (!listing) {
      return res.status(404).json({ success: false, message: 'Объявление не найдено' });
    }

    if (listing.seller.toString() !== req.user._id.toString() && req.user.role !== 'admin') {
      return res.status(403).json({ success: false, message: 'Нет прав на удаление' });
    }

    await listing.deleteOne();

    res.status(200).json({ success: true, message: 'Объявление удалено' });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};
