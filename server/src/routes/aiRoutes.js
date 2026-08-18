// ============================================================
// AI маршруты (без лишних require)
// Путь: server/src/routes/aiRoutes.js
// ============================================================
const router = require('express').Router();
const { getPredictions, createPrediction } = require('../controllers/aiController');
const { adminAuth } = require('../middleware/adminAuth');

router.get('/predictions', getPredictions);
router.post('/predictions', adminAuth, createPrediction);

module.exports = router;
