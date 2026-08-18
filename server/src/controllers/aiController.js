const Prediction = require('../models/Prediction');
const asyncHandler = require('../utils/asyncHandler');

exports.getPredictions = asyncHandler(async (req, res) => {
    const predictions = await Prediction.find().sort({ date: -1 }).limit(30);
    res.json(predictions);
}, { format: 'error' });

exports.createPrediction = asyncHandler(async (req, res) => {
    const { predictedPrice, confidence, date } = req.body;
    const prediction = new Prediction({
        date: date || new Date(),
        predictedPrice,
        confidence
    });
    await prediction.save();
    res.status(201).json(prediction);
}, { format: 'error' });
