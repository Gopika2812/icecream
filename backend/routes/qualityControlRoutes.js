const express = require('express');
const router = express.Router();
const { getQualityControls, getPendingPurchaseOrders, getQualityControl, createQualityControl } = require('../controllers/qualityControlController');
const { protect } = require('../middleware/authMiddleware');

router.use(protect);

router.route('/')
    .get(getQualityControls)
    .post(createQualityControl);

router.route('/pending-pos')
    .get(getPendingPurchaseOrders);

router.route('/:id')
    .get(getQualityControl);

module.exports = router;
