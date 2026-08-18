const Listing = require('../models/Listing');

const asyncHandler = require('../utils/asyncHandler');
const { assertFound } = require('../utils/apiError');
const { getPaginationParams } = require('../utils/pagination');
const { assertOwnerOrAdmin } = require('../utils/validation');
const { collectUploadedImages, parseJsonField } = require('../utils/requestData');

const NOT_FOUND = 'Объявление не найдено';

exports.getListings = asyncHandler(async (req, res) => {
    const { category, search, minPrice, maxPrice, status = 'active' } = req.query;
    const { page, limit, skip } = getPaginationParams(req.query, { defaultLimit: 10 });
    const query = { status };

    if (category) query.category = category;
    if (minPrice || maxPrice) {
        query.price = {};
        if (minPrice) query.price.$gte = Number(minPrice);
        if (maxPrice) query.price.$lte = Number(maxPrice);
    }
    if (search) query.$text = { $search: search };

    const listings = await Listing.find(query)
        .populate('seller', 'name email avatar')
        .sort({ createdAt: -1 })
        .skip(skip)
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
}, { format: 'success' });

exports.getListingById = asyncHandler(async (req, res) => {
    const listing = assertFound(
        await Listing.findByIdAndUpdate(
            req.params.id,
            { $inc: { viewsCount: 1 } },
            { new: true }
        ).populate('seller', 'name email avatar phone'),
        NOT_FOUND
    );

    res.status(200).json({ success: true, data: listing });
}, { format: 'success' });

exports.createListing = asyncHandler(async (req, res) => {
    const { title, description, price, currency, category, location } = req.body;

    const listing = await Listing.create({
        title,
        description,
        price,
        currency,
        category,
        images: collectUploadedImages(req),
        location: parseJsonField(location, {}),
        seller: req.user._id
    });

    res.status(201).json({ success: true, data: listing });
}, { format: 'success', status: 400 });

exports.updateListing = asyncHandler(async (req, res) => {
    const listing = assertFound(await Listing.findById(req.params.id), NOT_FOUND);
    assertOwnerOrAdmin(listing.seller, req.user, 'Нет прав на редактирование');

    const uploadedImages = collectUploadedImages(req);
    if (uploadedImages.length > 0) {
        req.body.images = [...listing.images, ...uploadedImages];
    }

    const updated = await Listing.findByIdAndUpdate(req.params.id, req.body, {
        new: true,
        runValidators: true
    });

    res.status(200).json({ success: true, data: updated });
}, { format: 'success', status: 400 });

exports.deleteListing = asyncHandler(async (req, res) => {
    const listing = assertFound(await Listing.findById(req.params.id), NOT_FOUND);
    assertOwnerOrAdmin(listing.seller, req.user, 'Нет прав на удаление');

    await listing.deleteOne();

    res.status(200).json({ success: true, message: 'Объявление удалено' });
}, { format: 'success' });
