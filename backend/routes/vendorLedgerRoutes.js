const express = require('express');
const router = express.Router();
const { getVendorLedger, createVendorPayment, getAllVendorSummaries } = require('../controllers/vendorLedgerController');
const { protect } = require('../middleware/authMiddleware');

router.use(protect);

router.get('/summaries/all', getAllVendorSummaries);
router.get('/:vendorId', getVendorLedger);
router.post('/payment', createVendorPayment);

module.exports = router;
