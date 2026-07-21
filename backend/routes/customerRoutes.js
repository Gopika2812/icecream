const express = require('express');
const router = express.Router();
const { getCustomers, getCustomer, createCustomer, updateCustomer } = require('../controllers/customerController');
const { protect } = require('../middleware/authMiddleware');

router.use(protect);

router.route('/')
    .get(getCustomers)
    .post(createCustomer);

router.route('/:id')
    .get(getCustomer)
    .put(updateCustomer);

module.exports = router;
