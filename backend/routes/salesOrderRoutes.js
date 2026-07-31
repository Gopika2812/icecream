const express = require('express');
const router = express.Router();
const { getSalesOrders, createSalesOrder, logAutoSalesReturn } = require('../controllers/salesOrderController');
const { protect } = require('../middleware/authMiddleware');

router.route('/')
    .get(protect, getSalesOrders)
    .post(protect, createSalesOrder);

router.route('/:id/auto-return')
    .post(protect, logAutoSalesReturn);

module.exports = router;
