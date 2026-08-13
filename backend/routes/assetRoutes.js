const express = require('express');
const router = express.Router();
const assetController = require('../controllers/assetController');
const { protect } = require('../middleware/auth');

router.use(protect);

router.route('/')
    .get(assetController.getAssets)
    .post(assetController.createAsset);

router.route('/:id')
    .put(assetController.updateAsset)
    .delete(assetController.deleteAsset);

router.route('/:id/maintenance')
    .get(assetController.getAssetMaintenanceHistory)
    .post(assetController.addAssetMaintenance);

module.exports = router;
