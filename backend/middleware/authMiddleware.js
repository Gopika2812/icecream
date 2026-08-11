const jwt = require('jsonwebtoken');
const User = require('../models/User');
const Role = require('../models/Role');
const Branch = require('../models/Branch');

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
            const secret = process.env.JWT_SECRET || 'super_secret_jwt_key_for_erp_2026';
            const decoded = jwt.verify(token, secret);

            // Fetch user
            let user = await User.findById(decoded.userId || decoded.id);

            if (!user) {
                res.status(401);
                throw new Error('Not authorized, user not found');
            }

            if (user.status && user.status !== 'Active') {
                res.status(401);
                throw new Error('Not authorized, user account is inactive');
            }

            // Remove password field
            delete user.password;

            // Resolve role reference if needed
            if (user.role && typeof user.role === 'string') {
                user.role = await Role.findById(user.role);
            }

            // Resolve primary branch reference if needed
            if (user.primaryBranch && typeof user.primaryBranch === 'string') {
                user.primaryBranch = await Branch.findById(user.primaryBranch);
            }

            req.user = user;
            next();
        } catch (error) {
            res.status(401);
            throw new Error(`Not authorized: ${error.message}`);
        }
    }

    if (!token) {
        res.status(401);
        throw new Error('Not authorized, no token provided');
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

        const permissions = req.user.role.permissions || [];
        const permission = permissions.find(p => p.module === moduleName);

        if (!permission || !permission.actions || !permission.actions[action]) {
            res.status(403);
            throw new Error(`User does not have ${action} permission for ${moduleName}`);
        }

        next();
    };
};

module.exports = { protect, authorize };
