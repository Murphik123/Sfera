const Listing = require('../models/Listing');

// @desc    Получить список всех объявлений (с фильтрацией, поиском и пагинацией)
// @route   GET /api/listings
// @access  Public
exports.getListings = async (req, res) => {
  try {
    const { page = 1, limit = 10, category, search, minPrice, maxPrice, status = 'active' } = req.query;

    const query = { status };

    if (category) {
      query.category = category;
    }

    if (minPrice || maxPrice) {
      query.price = {};
      if (minPrice) query.price.$gte = Number(minPrice);
      if (maxPrice) query.price.$lte = Number(maxPrice);
    }

    if (search) {
      query.$text = { $search: search };
    }

    const listings = await Listing.find(query)
      .populate('seller', 'name email avatar')
      .sort({ createdAt: -1 })
      .skip((page - 1) * limit)
      .limit(Number(limit));

    const total = await Listing.countDocuments(query);

    res.status(200).json({
      success: true,
      count: listings.length,
      total,
      totalPages: Math.ceil(total / limit),
      currentPage: Number(page),
      data: listings
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// @desc    Получить одно объявление по ID
// @route   GET /api/listings/:id
// @access  Public
exports.getListingById = async (req, res) => {
  try {
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

// @desc    Создать новое объявление (с загрузкой картинок)
// @route   POST /api/listings
// @access  Private
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

    let images = [];
    if (req.files && req.files.length > 0) {
      images = req.files.map((file) => ({
        url: file.path,
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

// @desc    Обновить объявление
// @route   PUT /api/listings/:id
// @access  Private (только владелец)
exports.updateListing = async (req, res) => {
  try {
    let listing = await Listing.findById(req.params.id);

    if (!listing) {
      return res.status(404).json({ success: false, message: 'Объявление не найдено' });
    }

    if (listing.seller.toString() !== req.user._id.toString() && req.user.role !== 'admin') {
      return res.status(403).json({ success: false, message: 'Нет прав на редактирование' });
    }

    // Если при вызове загружены новые изображения, обновляем их
    if (req.files && req.files.length > 0) {
      const newImages = req.files.map((file) => ({
        url: file.path,
        public_id: file.filename
      }));
      req.body.images = [...listing.images, ...newImages];
    }

    listing = await Listing.findByIdAndUpdate(req.params.id, req.body, {
      new: true,
      runValidators: true
    });

    res.status(200).json({ success: true, data: listing });
  } catch (error) {
    res.status(400).json({ success: false, message: error.message });
  }
};

// @desc    Удалить объявление
// @route   DELETE /api/listings/:id
// @access  Private (только владелец)
exports.deleteListing = async (req, res) => {
  try {
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
