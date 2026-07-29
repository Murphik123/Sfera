// server/src/controllers/adminController.js
const User = require('../models/User');
const Transaction = require('../models/Transaction');
const Listing = require('../models/Listing');
const Mail = require('../models/Mail');
const Prediction = require('../models/Prediction');

// ------------------ СТАТИСТИКА ------------------
exports.getStats = async (req, res) => {
    try {
        const totalUsers = await User.countDocuments();
        const totalTransactions = await Transaction.countDocuments();
        const totalListings = await Listing.countDocuments();
        const totalMails = await Mail.countDocuments();
        const totalPredictions = await Prediction.countDocuments();

        res.json({
            users: totalUsers,
            transactions: totalTransactions,
            listings: totalListings,
            mails: totalMails,
            predictions: totalPredictions
        });
    } catch (err) {
        res.status(500).json({ message: err.message });
    }
};

// ------------------ ПОЛЬЗОВАТЕЛИ ------------------
exports.getUsers = async (req, res) => {
    try {
        const { page = 1, limit = 20, search = '' } = req.query;
        const query = search ? { $or: [{ username: { $regex: search, $options: 'i' } }, { email: { $regex: search, $options: 'i' } }] } : {};
        const users = await User.find(query)
            .select('-password')
            .limit(limit * 1)
            .skip((page - 1) * limit)
            .sort({ createdAt: -1 });
        const total = await User.countDocuments(query);
        res.json({ users, total, page, pages: Math.ceil(total / limit) });
    } catch (err) {
        res.status(500).json({ message: err.message });
    }
};

exports.getUser = async (req, res) => {
    try {
        const user = await User.findById(req.params.id).select('-password');
        if (!user) return res.status(404).json({ message: 'User not found' });
        res.json(user);
    } catch (err) {
        res.status(500).json({ message: err.message });
    }
};

exports.updateUser = async (req, res) => {
    try {
        const { username, email, role, isBlocked } = req.body;
        const user = await User.findById(req.params.id);
        if (!user) return res.status(404).json({ message: 'User not found' });

        if (username) user.username = username;
        if (email) user.email = email;
        if (role) user.role = role;
        if (isBlocked !== undefined) user.isBlocked = isBlocked;

        await user.save();
        res.json({ message: 'User updated', user: user.toObject({ getters: true, versionKey: false }) });
    } catch (err) {
        res.status(500).json({ message: err.message });
    }
};

exports.deleteUser = async (req, res) => {
    try {
        const user = await User.findByIdAndDelete(req.params.id);
        if (!user) return res.status(404).json({ message: 'User not found' });
        res.json({ message: 'User deleted' });
    } catch (err) {
        res.status(500).json({ message: err.message });
    }
};

// ------------------ ТРАНЗАКЦИИ ------------------
exports.getTransactions = async (req, res) => {
    try {
        const { page = 1, limit = 20 } = req.query;
        const transactions = await Transaction.find()
            .populate('userId', 'username email')
            .limit(limit * 1)
            .skip((page - 1) * limit)
            .sort({ createdAt: -1 });
        const total = await Transaction.countDocuments();
        res.json({ transactions, total, page, pages: Math.ceil(total / limit) });
    } catch (err) {
        res.status(500).json({ message: err.message });
    }
};

// ------------------ ОБЪЯВЛЕНИЯ (ЛИСТИНГИ) ------------------
exports.getListings = async (req, res) => {
    try {
        const { page = 1, limit = 20, status } = req.query;
        const filter = status ? { status } : {};
        const listings = await Listing.find(filter)
            .populate('sellerId', 'username email')
            .limit(limit * 1)
            .skip((page - 1) * limit)
            .sort({ createdAt: -1 });
        const total = await Listing.countDocuments(filter);
        res.json({ listings, total, page, pages: Math.ceil(total / limit) });
    } catch (err) {
        res.status(500).json({ message: err.message });
    }
};

exports.updateListing = async (req, res) => {
    try {
        const { status } = req.body; // например, 'active', 'pending', 'blocked'
        const listing = await Listing.findById(req.params.id);
        if (!listing) return res.status(404).json({ message: 'Listing not found' });
        if (status) listing.status = status;
        await listing.save();
        res.json({ message: 'Listing updated', listing });
    } catch (err) {
        res.status(500).json({ message: err.message });
    }
};

exports.deleteListing = async (req, res) => {
    try {
        const listing = await Listing.findByIdAndDelete(req.params.id);
        if (!listing) return res.status(404).json({ message: 'Listing not found' });
        res.json({ message: 'Listing deleted' });
    } catch (err) {
        res.status(500).json({ message: err.message });
    }
};

// ------------------ ПОЧТА ------------------
exports.getMails = async (req, res) => {
    try {
        const { page = 1, limit = 20 } = req.query;
        const mails = await Mail.find()
            .populate('from', 'username email')
            .populate('to', 'username email')
            .limit(limit * 1)
            .skip((page - 1) * limit)
            .sort({ createdAt: -1 });
        const total = await Mail.countDocuments();
        res.json({ mails, total, page, pages: Math.ceil(total / limit) });
    } catch (err) {
        res.status(500).json({ message: err.message });
    }
};

exports.deleteMail = async (req, res) => {
    try {
        const mail = await Mail.findByIdAndDelete(req.params.id);
        if (!mail) return res.status(404).json({ message: 'Mail not found' });
        res.json({ message: 'Mail deleted' });
    } catch (err) {
        res.status(500).json({ message: err.message });
    }
};

// ------------------ AI ПРОГНОЗЫ ------------------
exports.getPredictions = async (req, res) => {
    try {
        const { page = 1, limit = 20 } = req.query;
        const predictions = await Prediction.find()
            .limit(limit * 1)
            .skip((page - 1) * limit)
            .sort({ createdAt: -1 });
        const total = await Prediction.countDocuments();
        res.json({ predictions, total, page, pages: Math.ceil(total / limit) });
    } catch (err) {
        res.status(500).json({ message: err.message });
    }
};

exports.createPrediction = async (req, res) => {
    try {
        const { coin, predictedPrice, confidence, notes } = req.body;
        const prediction = new Prediction({ coin, predictedPrice, confidence, notes });
        await prediction.save();
        res.status(201).json(prediction);
    } catch (err) {
        res.status(500).json({ message: err.message });
    }
};

exports.deletePrediction = async (req, res) => {
    try {
        const prediction = await Prediction.findByIdAndDelete(req.params.id);
        if (!prediction) return res.status(404).json({ message: 'Prediction not found' });
        res.json({ message: 'Prediction deleted' });
    } catch (err) {
        res.status(500).json({ message: err.message });
    }
};
