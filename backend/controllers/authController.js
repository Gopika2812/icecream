const User = require('../models/User');
const Role = require('../models/Role');
const Branch = require('../models/Branch');
const generateTokens = require('../utils/generateToken');
const jwt = require('jsonwebtoken');

// @desc    Auth user & get token
// @route   POST /api/v1/auth/login
// @access  Public
const loginUser = async (req, res) => {
    try {
        const { username, password } = req.body;

        const user = await User.findOne({ username }).populate('role');

        if (user && (await user.matchPassword(password))) {
            if (user.status !== 'Active') {
                return res.status(401).json({ success: false, message: 'User account is not active' });
            }

            const accessToken = generateTokens(res, user._id);

            res.json({
                success: true,
                _id: user._id,
                name: user.name,
                username: user.username,
                role: user.role.name,
                accessToken,
            });
        } else {
            res.status(401).json({ success: false, message: 'Invalid username or password' });
        }
    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
};

// @desc    Refresh access token
// @route   POST /api/v1/auth/refresh
// @access  Public
const refreshToken = async (req, res) => {
    const refreshToken = req.cookies.jwt;

    if (!refreshToken) {
        return res.status(401).json({ success: false, message: 'Not authorized, no refresh token' });
    }

    try {
        const decoded = jwt.verify(refreshToken, process.env.JWT_REFRESH_SECRET);
        
        const user = await User.findById(decoded.userId).populate('role');
        if (!user || user.status !== 'Active') {
            return res.status(401).json({ success: false, message: 'User not found or inactive' });
        }

        const accessToken = generateTokens(res, user._id); // This also sets a new refresh token

        res.json({ success: true, accessToken });
    } catch (error) {
        res.status(401).json({ success: false, message: 'Not authorized, refresh token failed' });
    }
};

// @desc    Logout user / clear cookie
// @route   POST /api/v1/auth/logout
// @access  Public
const logoutUser = (req, res) => {
    res.cookie('jwt', '', {
        httpOnly: true,
        expires: new Date(0),
    });
    res.status(200).json({ success: true, message: 'Logged out successfully' });
};

// @desc    Get user profile
// @route   GET /api/v1/auth/me
// @access  Private
const getUserProfile = async (req, res) => {
    try {
        const user = await User.findById(req.user._id).populate('role').populate('primaryBranch').populate('assignedBranches');

        if (user) {
            res.json({ success: true, user });
        } else {
            res.status(404).json({ success: false, message: 'User not found' });
        }
    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
};

module.exports = {
    loginUser,
    refreshToken,
    logoutUser,
    getUserProfile,
};
