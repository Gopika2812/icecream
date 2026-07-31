const express = require('express');
const router = express.Router();
const { getAutoSalesEntries, getPreviousOpeningStock, createAutoSalesEntry } = require('../controllers/autoSalesController');
const { protect } = require('../middleware/authMiddleware');

router.route('/')
    .get(protect, getAutoSalesEntries)
    .post(protect, createAutoSalesEntry);

router.route('/previous-opening')
    .get(protect, getPreviousOpeningStock);

module.exports = router;
