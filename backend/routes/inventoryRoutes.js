const express = require('express');
const router = express.Router();
const { getInventory, getInventoryTransactions } = require('../controllers/inventoryController');
const { protect } = require('../middleware/authMiddleware');

router.use(protect);

router.route('/')
    .get(getInventory);

router.route('/transactions')
    .get(getInventoryTransactions);

module.exports = router;
