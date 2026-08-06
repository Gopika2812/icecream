const express = require('express');
const router = express.Router();
const { getItemTypes, createItemType, updateItemType, deleteItemType } = require('../controllers/itemTypeController');
const { protect } = require('../middleware/authMiddleware');

router.use(protect);

router.route('/')
    .get(getItemTypes)
    .post(createItemType);

router.route('/:id')
    .put(updateItemType)
    .delete(deleteItemType);

module.exports = router;
