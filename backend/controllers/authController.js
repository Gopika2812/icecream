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
            if (user.status === 'Pending') {
                return res.status(401).json({ success: false, message: 'Your account is pending admin approval' });
            }
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

// @desc    Register a new user
// @route   POST /api/v1/auth/register
// @access  Public
const registerUser = async (req, res) => {
    try {
        const { name, username, email, password, branchCode } = req.body;

        // Check if user exists
        const userExists = await User.findOne({ $or: [{ email }, { username }] });
        if (userExists) {
            return res.status(400).json({ success: false, message: 'User already exists' });
        }

        // Verify Branch Code
        let primaryBranch = null;
        if (branchCode) {
            const branch = await Branch.findOne({ branchCode });
            if (!branch) {
                return res.status(400).json({ success: false, message: 'Invalid Branch Code' });
            }
            primaryBranch = branch._id;
        } else {
            return res.status(400).json({ success: false, message: 'Branch Code is required for registration' });
        }

        // Assign default role (e.g., 'Employee' or 'User')
        let role = await Role.findOne({ name: 'Employee' });
        if (!role) {
            role = await Role.create({
                name: 'Employee',
                description: 'Default role for registered users',
                permissions: [] // Default empty permissions array
            });
        }

        // Generate temporary employee ID
        const employeeId = 'EMP' + Math.floor(1000 + Math.random() * 9000);

        const user = await User.create({
            employeeId,
            name,
            username,
            email,
            password,
            primaryBranch,
            role: role._id,
            status: 'Pending' // Explicitly set to Pending for admin approval
        });

        res.status(201).json({
            success: true,
            message: 'Registration successful. Please wait for an administrator to approve your account.'
        });
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
    registerUser,
    refreshToken,
    logoutUser,
    getUserProfile,
};
