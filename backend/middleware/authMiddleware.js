const jwt = require('jsonwebtoken');
const User = require('../models/User');

const protect = async (req, res, next) => {
    let token;

    if (
        req.headers.authorization &&
        req.headers.authorization.startsWith('Bearer')
    ) {
        try {
            // Get token from header
            token = req.headers.authorization.split(' ')[1];

            // Verify token
            const decoded = jwt.verify(token, process.env.JWT_SECRET);

            // Get user from the token
            req.user = await User.findById(decoded.userId).select('-password').populate('role').populate('primaryBranch').populate('assignedBranches');
            
            if (!req.user || req.user.status !== 'Active') {
                res.status(401);
                throw new Error('Not authorized, user not found or inactive');
            }

            next();
        } catch (error) {
            res.status(401);
            throw new Error('Not authorized, token failed');
        }
    }

    if (!token) {
        res.status(401);
        throw new Error('Not authorized, no token');
    }
};

const authorize = (moduleName, action) => {
    return (req, res, next) => {
        if (!req.user || !req.user.role) {
            res.status(403);
            throw new Error('User role not found');
        }

        // Super Admin bypass
        if (req.user.role.name === 'Super Admin') {
            return next();
        }

        const permission = req.user.role.permissions.find(p => p.module === moduleName);

        if (!permission || !permission.actions[action]) {
            res.status(403);
            throw new Error(`User does not have ${action} permission for ${moduleName}`);
        }

        next();
    };
};

module.exports = { protect, authorize };
