const express = require('express');
const router = express.Router();
const { getCustomerLedger, createCustomerReceipt, getAllCustomerSummaries } = require('../controllers/customerLedgerController');
const { protect } = require('../middleware/authMiddleware');

router.use(protect);

router.get('/summaries/all', getAllCustomerSummaries);
router.get('/:customerId', getCustomerLedger);
router.post('/receipt', createCustomerReceipt);

module.exports = router;
