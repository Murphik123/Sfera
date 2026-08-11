const router = require('express').Router();
const { getListings, createListing, createOrder } = require('../controllers/marketplaceController');

router.get('/listings', getListings);
router.post('/listings', createListing);
router.post('/orders', createOrder);

module.exports = router;
