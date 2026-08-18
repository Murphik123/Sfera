const User = require('../models/User');
const Transaction = require('../models/Transaction');
const Listing = require('../models/Listing');
const Mail = require('../models/Mail');
const Prediction = require('../models/Prediction');

const asyncHandler = require('../utils/asyncHandler');
const { assertFound } = require('../utils/apiError');
const { paginate, paginatedResponse } = require('../utils/pagination');
const { buildSearchFilter, assertValidObjectId } = require('../utils/validation');

// ---------- СТАТИСТИКА ----------
exports.getStats = asyncHandler(async (req, res) => {
    const [users, transactions, listings, mails, predictions] = await Promise.all([
        User.countDocuments(),
        Transaction.countDocuments(),
        Listing.countDocuments(),
        Mail.countDocuments(),
        Prediction.countDocuments()
    ]);
    res.json({ users, transactions, listings, mails, predictions });
});

// ---------- ПОЛЬЗОВАТЕЛИ ----------
exports.getUsers = asyncHandler(async (req, res) => {
    const filter = buildSearchFilter(req.query.search, ['username', 'email']);
    const result = await paginate(User, filter, { query: req.query, select: '-password' });
    res.json(paginatedResponse('users', result));
});

exports.getUser = asyncHandler(async (req, res) => {
    assertValidObjectId(req.params.id, 'User');
    const user = assertFound(
        await User.findById(req.params.id).select('-password'),
        'User not found'
    );
    res.json(user);
});

exports.updateUser = asyncHandler(async (req, res) => {
    assertValidObjectId(req.params.id, 'User');
    const { username, email, role, isBlocked } = req.body;
    const user = assertFound(await User.findById(req.params.id), 'User not found');

    if (username) user.username = username;
    if (email) user.email = email;
    if (role) user.role = role;
    if (isBlocked !== undefined) user.isBlocked = isBlocked;

    await user.save();
    res.json({ message: 'User updated', user: user.toObject({ getters: true, versionKey: false }) });
});

exports.deleteUser = asyncHandler(async (req, res) => {
    assertValidObjectId(req.params.id, 'User');
    assertFound(await User.findByIdAndDelete(req.params.id), 'User not found');
    res.json({ message: 'User deleted' });
});

// ---------- ТРАНЗАКЦИИ ----------
exports.getTransactions = asyncHandler(async (req, res) => {
    const result = await paginate(Transaction, {}, {
        query: req.query,
        populate: [['userId', 'username email']]
    });
    res.json(paginatedResponse('transactions', result));
});

// ---------- ОБЪЯВЛЕНИЯ ----------
exports.getListings = asyncHandler(async (req, res) => {
    const { status } = req.query;
    const result = await paginate(Listing, status ? { status } : {}, {
        query: req.query,
        populate: [['sellerId', 'username email']]
    });
    res.json(paginatedResponse('listings', result));
});

exports.updateListing = asyncHandler(async (req, res) => {
    assertValidObjectId(req.params.id, 'Listing');
    const { status } = req.body;
    const listing = assertFound(await Listing.findById(req.params.id), 'Listing not found');

    if (status) listing.status = status;
    await listing.save();
    res.json({ message: 'Listing updated', listing });
});

exports.deleteListing = asyncHandler(async (req, res) => {
    assertValidObjectId(req.params.id, 'Listing');
    assertFound(await Listing.findByIdAndDelete(req.params.id), 'Listing not found');
    res.json({ message: 'Listing deleted' });
});

// ---------- ПОЧТА ----------
exports.getMails = asyncHandler(async (req, res) => {
    const result = await paginate(Mail, {}, {
        query: req.query,
        populate: [['from', 'username email'], ['to', 'username email']]
    });
    res.json(paginatedResponse('mails', result));
});

exports.deleteMail = asyncHandler(async (req, res) => {
    assertValidObjectId(req.params.id, 'Mail');
    assertFound(await Mail.findByIdAndDelete(req.params.id), 'Mail not found');
    res.json({ message: 'Mail deleted' });
});

// ---------- AI ПРОГНОЗЫ ----------
exports.getPredictions = asyncHandler(async (req, res) => {
    const result = await paginate(Prediction, {}, { query: req.query });
    res.json(paginatedResponse('predictions', result));
});

exports.createPrediction = asyncHandler(async (req, res) => {
    const { coin, predictedPrice, confidence, notes } = req.body;
    const prediction = new Prediction({ coin, predictedPrice, confidence, notes });
    await prediction.save();
    res.status(201).json(prediction);
});

exports.deletePrediction = asyncHandler(async (req, res) => {
    assertValidObjectId(req.params.id, 'Prediction');
    assertFound(await Prediction.findByIdAndDelete(req.params.id), 'Prediction not found');
    res.json({ message: 'Prediction deleted' });
});
