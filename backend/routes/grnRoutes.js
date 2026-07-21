const express = require('express');
const router = express.Router();
const { getGRNs, getGRN, createGRN } = require('../controllers/grnController');
const { protect } = require('../middleware/authMiddleware');

router.use(protect);

router.route('/')
    .get(getGRNs)
    .post(createGRN);

router.route('/:id')
    .get(getGRN);

module.exports = router;
