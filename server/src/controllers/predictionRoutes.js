// src/routes/predictionRoutes.js
const express = require('express');
const router = express.Router();
const predictionController = require('../controllers/predictionController');

// GET /api/predictions
router.get('/', predictionController.getPredictions);

module.exports = router;
