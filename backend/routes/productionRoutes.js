const express = require('express');
const router = express.Router();
const { 
  getProductionBatches, createProductionBatch, dispatchStock, 
  startProduction, completeProduction, sendToQc, approveFinishedGoodsQC, performFinishedGoodsQC 
} = require('../controllers/productionController');
const { protect } = require('../middleware/authMiddleware');

router.use(protect);

router.route('/')
    .get(getProductionBatches)
    .post(createProductionBatch);

router.post('/:id/dispatch', dispatchStock);
router.post('/:id/start-production', startProduction);
router.post('/:id/complete-production', completeProduction);
router.post('/:id/send-to-qc', sendToQc);
router.post('/:id/approve-qc', approveFinishedGoodsQC);
router.post('/:id/qc', performFinishedGoodsQC);

module.exports = router;
