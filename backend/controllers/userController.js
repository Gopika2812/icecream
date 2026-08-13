const User = require('../models/User');

// @desc    Get all users
// @route   GET /api/v1/users
// @access  Private
const getUsers = async (req, res) => {
    try {
        const rawUsers = await User.find();
        const users = (rawUsers || []).map(u => {
            const copy = { ...u };
            delete copy.password;
            return copy;
        });
        res.json({ success: true, count: users.length, data: users });
    } catch (error) {
        console.error('Failed to get users:', error);
        res.status(500).json({ success: false, message: error.message });
    }
};

// @desc    Get single user
// @route   GET /api/v1/users/:id
// @access  Private
const getUser = async (req, res) => {
    try {
        const user = await User.findById(req.params.id);
        
        if (!user) {
            return res.status(404).json({ success: false, message: 'User not found' });
        }
        
        const copy = { ...user };
        delete copy.password;
        res.json({ success: true, data: copy });
    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
};

// @desc    Create new user
// @route   POST /api/v1/users
// @access  Private
const createUser = async (req, res) => {
    try {
        req.body.createdBy = req.user ? req.user._id : undefined;
        const user = await User.create(req.body);
        const copy = { ...user };
        delete copy.password;
        res.status(201).json({ success: true, data: copy });
    } catch (error) {
        res.status(400).json({ success: false, message: error.message });
    }
};

// @desc    Update user
// @route   PUT /api/v1/users/:id
// @access  Private
const updateUser = async (req, res) => {
    try {
        req.body.updatedBy = req.user ? req.user._id : undefined;

        const user = await User.findByIdAndUpdate(req.params.id, req.body);

        if (!user) {
            return res.status(404).json({ success: false, message: 'User not found' });
        }

        const copy = { ...user };
        delete copy.password;
        res.json({ success: true, data: copy });
    } catch (error) {
        res.status(400).json({ success: false, message: error.message });
    }
};

// @desc    Delete user
// @route   DELETE /api/v1/users/:id
// @access  Private
const deleteUser = async (req, res) => {
    try {
        const user = await User.findByIdAndUpdate(req.params.id, {
            status: 'Inactive',
            updatedBy: req.user ? req.user._id : undefined
        });

        if (!user) {
            return res.status(404).json({ success: false, message: 'User not found' });
        }

        res.json({ success: true, data: {} });
    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
};

module.exports = {
    getUsers,
    getUser,
    createUser,
    updateUser,
    deleteUser
};
