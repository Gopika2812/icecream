const express = require('express');
const router = express.Router();
const { getProductionBatches, createProductionBatch, performFinishedGoodsQC } = require('../controllers/productionController');
const { protect } = require('../middleware/authMiddleware');

router.use(protect);

router.route('/')
    .get(getProductionBatches)
    .post(createProductionBatch);

router.post('/:id/qc', performFinishedGoodsQC);

module.exports = router;
