const express = require('express');
const router = express.Router();
const { getPurchaseOrders, getPurchaseOrder, createPurchaseOrder, updatePurchaseOrderStatus } = require('../controllers/purchaseOrderController');
const { protect } = require('../middleware/authMiddleware');

router.use(protect);

router.route('/')
    .get(getPurchaseOrders)
    .post(createPurchaseOrder);

router.route('/:id')
    .get(getPurchaseOrder);

router.route('/:id/status')
    .put(updatePurchaseOrderStatus);

module.exports = router;
