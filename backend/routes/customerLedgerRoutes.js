const express = require('express');
const router = express.Router();
const { 
    getCustomerLedger, 
    createCustomerReceipt, 
    getAllCustomerSummaries,
    getPendingInvoices,
    getAllReceipts,
    createAutoSalesSettlement
} = require('../controllers/customerLedgerController');
const { protect } = require('../middleware/authMiddleware');

router.use(protect);

router.get('/summaries/all', getAllCustomerSummaries);
router.get('/pending-invoices', getPendingInvoices);
router.get('/receipts/all', getAllReceipts);
router.post('/receipt', createCustomerReceipt);
router.post('/auto-settlement', createAutoSalesSettlement);
router.get('/:customerId', getCustomerLedger);

module.exports = router;
