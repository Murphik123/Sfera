const router = require('express').Router();
const { getPredictions, createPrediction } = require('../controllers/aiController');

router.get('/predictions', getPredictions);
router.post('/predictions', createPrediction);

module.exports = router;
