const express = require('express');
const router = express.Router();
const { handleSemanticSearch } = require('../controllers/searchController');

router.post('/semantic', handleSemanticSearch);

module.exports = router;
