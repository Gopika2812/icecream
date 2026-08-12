const express = require('express');
const router = express.Router();
const { getProductRequisitions, createProductRequisition, updateRequisitionStatus } = require('../controllers/productRequisitionController');
const { protect } = require('../middleware/authMiddleware');

router.use(protect);

router.route('/')
    .get(getProductRequisitions)
    .post(createProductRequisition);

router.patch('/:id/status', updateRequisitionStatus);

module.exports = router;
