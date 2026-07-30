const express = require('express');
const router = express.Router();
const { getInventory, getInventoryTransactions, createInventoryTransaction } = require('../controllers/inventoryController');
const { protect } = require('../middleware/authMiddleware');

router.use(protect);

router.route('/')
    .get(getInventory);

router.route('/transactions')
    .get(getInventoryTransactions)
    .post(createInventoryTransaction);

module.exports = router;
