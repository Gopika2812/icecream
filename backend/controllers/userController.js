const User = require('../models/User');

// @desc    Get all users
// @route   GET /api/v1/users
// @access  Private
const getUsers = async (req, res) => {
    try {
        const users = await User.find().select('-password').populate('role').populate('primaryBranch');
        res.json({ success: true, count: users.length, data: users });
    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
};

// @desc    Get single user
// @route   GET /api/v1/users/:id
// @access  Private
const getUser = async (req, res) => {
    try {
        const user = await User.findById(req.params.id).select('-password').populate('role').populate('primaryBranch').populate('assignedBranches');
        
        if (!user) {
            return res.status(404).json({ success: false, message: 'User not found' });
        }
        
        res.json({ success: true, data: user });
    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
};

// @desc    Create new user
// @route   POST /api/v1/users
// @access  Private
const createUser = async (req, res) => {
    try {
        req.body.createdBy = req.user._id;
        const user = await User.create(req.body);
        user.password = undefined; // Do not return password
        res.status(201).json({ success: true, data: user });
    } catch (error) {
        res.status(400).json({ success: false, message: error.message });
    }
};

// @desc    Update user
// @route   PUT /api/v1/users/:id
// @access  Private
const updateUser = async (req, res) => {
    try {
        req.body.updatedBy = req.user._id;
        
        // Ensure password is not updated here, create separate route if needed
        if (req.body.password) {
            delete req.body.password;
        }

        const user = await User.findByIdAndUpdate(req.params.id, req.body, {
            new: true,
            runValidators: true
        }).select('-password');

        if (!user) {
            return res.status(404).json({ success: false, message: 'User not found' });
        }

        res.json({ success: true, data: user });
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
            updatedBy: req.user._id
        }, { new: true });

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
