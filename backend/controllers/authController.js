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
        console.log('Login attempt:', { username, passwordReceived: Boolean(password) });

        const allUsers = await User.find();
        console.log('Users scanned count:', allUsers.length);

        const user = allUsers.find(u => u.username && u.username.toLowerCase() === (username || '').trim().toLowerCase());
        console.log('Found user:', user ? user.username : 'NONE');

        if (!user) {
            return res.status(401).json({ success: false, message: 'Invalid username or password' });
        }

        const isMatch = await User.matchPassword(password, user.password);
        console.log('Match result:', isMatch);

        if (user && isMatch) {
            if (user.status === 'Pending') {
                return res.status(401).json({ success: false, message: 'Your account is pending admin approval' });
            }
            if (user.status !== 'Active') {
                return res.status(401).json({ success: false, message: 'User account is not active' });
            }

            let roleName = 'Employee';
            if (user.role) {
                if (typeof user.role === 'object' && user.role.name) {
                    roleName = user.role.name;
                } else if (typeof user.role === 'string') {
                    if (user.role.length > 20) {
                        const roleObj = await Role.findById(user.role);
                        if (roleObj) roleName = roleObj.name;
                    } else {
                        roleName = user.role;
                    }
                }
            }

            const accessToken = generateTokens(res, user._id || user.id);

            res.json({
                success: true,
                _id: user._id || user.id,
                id: user.id || user._id,
                name: user.name,
                username: user.username,
                role: roleName,
                allowedPages: user.allowedPages || [],
                accessToken,
            });
        } else {
            res.status(401).json({ success: false, message: 'Invalid username or password' });
        }
    } catch (error) {
        console.error('Error in loginUser:', error);
        res.status(500).json({ success: false, message: error.message });
    }
};

// @desc    Register a new user
// @route   POST /api/v1/auth/register
// @access  Public
const registerUser = async (req, res) => {
    try {
        const { name, username, email, password, branchCode } = req.body;

        // Check if user exists by email or username
        const existingEmail = await User.findOne({ email });
        const existingUsername = await User.findOne({ username });

        if (existingEmail || existingUsername) {
            return res.status(400).json({ success: false, message: 'User with this email or username already exists' });
        }

        // Verify Branch Code
        let primaryBranch = null;
        if (branchCode) {
            const branch = await Branch.findOne({ branchCode });
            if (!branch) {
                return res.status(400).json({ success: false, message: 'Invalid Branch Code' });
            }
            primaryBranch = branch._id || branch.id;
        } else {
            return res.status(400).json({ success: false, message: 'Branch Code is required for registration' });
        }

        // Assign default role (e.g., 'Employee' or 'User')
        let role = await Role.findOne({ name: 'Employee' });
        if (!role) {
            role = await Role.create({
                name: 'Employee',
                description: 'Default role for registered users',
                permissions: []
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
            role: role._id || role.id,
            status: 'Pending'
        });

        res.status(201).json({
            success: true,
            message: 'Registration successful. Please wait for an administrator to approve your account.'
        });
    } catch (error) {
        console.error('Error in registerUser:', error);
        res.status(500).json({ success: false, message: error.message });
    }
};

// @desc    Refresh access token
// @route   POST /api/v1/auth/refresh
// @access  Public
const refreshToken = async (req, res) => {
    const refreshToken = req.cookies?.jwt;

    if (!refreshToken) {
        return res.status(401).json({ success: false, message: 'Not authorized, no refresh token' });
    }

    try {
        const refreshSecret = process.env.JWT_REFRESH_SECRET || process.env.JWT_SECRET || 'icecream_erp_super_secret_jwt_key_2026';
        const decoded = jwt.verify(refreshToken, refreshSecret);
        
        const user = await User.findById(decoded.userId || decoded.id);
        if (!user || user.status !== 'Active') {
            return res.status(401).json({ success: false, message: 'User not found or inactive' });
        }

        const accessToken = generateTokens(res, user._id || user.id);

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
        const user = await User.findById(req.user._id || req.user.id);

        if (user) {
            if (user.role && typeof user.role === 'string') {
                user.role = await Role.findById(user.role);
            }
            if (user.primaryBranch && typeof user.primaryBranch === 'string') {
                user.primaryBranch = await Branch.findById(user.primaryBranch);
            }
            delete user.password;
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
