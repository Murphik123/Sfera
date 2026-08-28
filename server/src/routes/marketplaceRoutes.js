const router = require('express').Router();
const { getListings, createListing, createOrder } = require('../controllers/marketplaceController');

// Поддерживаем корневой адрес /api/marketplace и вложенный /api/marketplace/listings
router.get('/', getListings);
router.get('/listings', getListings);

router.post('/', createListing);
router.post('/listings', createListing);

router.post('/orders', createOrder);

module.exports = router;
