const express = require('express');
const router = express.Router();
const {
    getBranches,
    getBranch,
    createBranch,
    updateBranch,
    deleteBranch
} = require('../controllers/branchController');
const { protect, authorize } = require('../middleware/authMiddleware');

router.use(protect);
// Assume 'branches' module is checked for these permissions
router.route('/')
    .get(authorize('branches', 'view'), getBranches)
    .post(authorize('branches', 'create'), createBranch);

router.route('/:id')
    .get(authorize('branches', 'view'), getBranch)
    .put(authorize('branches', 'edit'), updateBranch)
    .delete(authorize('branches', 'delete'), deleteBranch);

module.exports = router;
