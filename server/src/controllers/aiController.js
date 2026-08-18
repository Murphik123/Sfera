const Prediction = require('../models/Prediction');

exports.getPredictions = async (req, res, next) => {
  try {
    const predictions = await Prediction.find().sort({ date: -1 }).limit(30);
    res.json(predictions);
  } catch (error) {
    return next(error);
  }
};

exports.createPrediction = async (req, res, next) => {
  try {
    const { predictedPrice, confidence, date } = req.body;
    const prediction = new Prediction({
      date: date || new Date(),
      predictedPrice,
      confidence
    });
    await prediction.save();
    res.status(201).json(prediction);
  } catch (error) {
    return next(error);
  }
};
