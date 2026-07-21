const express = require('express');
const router = express.Router();
const { getVendors, getVendor, createVendor, updateVendor } = require('../controllers/vendorController');
const { protect } = require('../middleware/authMiddleware');

router.use(protect);

router.route('/')
    .get(getVendors)
    .post(createVendor);

router.route('/:id')
    .get(getVendor)
    .put(updateVendor);

module.exports = router;
