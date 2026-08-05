const express = require('express');
const router = express.Router();
const {
  getListings,
  getListingById,
  createListing,
  updateListing,
  deleteListing
} = require('../controllers/listingController');
const { protect } = require('../middleware/authMiddleware');
const { upload } = require('../config/cloudinary');

// Публичные маршруты
router.get('/', getListings);
router.get('/:id', getListingById);

// Защищенные маршруты (поддержка до 5 изображений на запрос)
router.post('/', protect, upload.array('images', 5), createListing);
router.put('/:id', protect, upload.array('images', 5), updateListing);
router.delete('/:id', protect, deleteListing);

module.exports = router;
