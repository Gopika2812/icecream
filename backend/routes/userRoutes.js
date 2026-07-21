const express = require('express');
const router = express.Router();
const {
    getUsers,
    getUser,
    createUser,
    updateUser,
    deleteUser
} = require('../controllers/userController');
const { protect, authorize } = require('../middleware/authMiddleware');

router.use(protect);

router.route('/')
    .get(authorize('users', 'view'), getUsers)
    .post(authorize('users', 'create'), createUser);

router.route('/:id')
    .get(authorize('users', 'view'), getUser)
    .put(authorize('users', 'edit'), updateUser)
    .delete(authorize('users', 'delete'), deleteUser);

module.exports = router;
