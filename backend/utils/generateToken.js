const jwt = require('jsonwebtoken');

const generateTokens = (res, userId) => {
    const accessToken = jwt.sign({ userId }, process.env.JWT_SECRET, {
        expiresIn: process.env.JWT_EXPIRES_IN || '1d',
    });

    const refreshToken = jwt.sign({ userId }, process.env.JWT_REFRESH_SECRET, {
        expiresIn: process.env.JWT_REFRESH_EXPIRES_IN || '7d',
    });

    // Set refresh token in HTTP-only cookie
    res.cookie('jwt', refreshToken, {
        httpOnly: true,
        secure: true, // Required for cross-site cookies
        sameSite: 'none', // Allow cross-site cookies between Firebase frontend and Render backend
        maxAge: 7 * 24 * 60 * 60 * 1000, // 7 days
    });

    return accessToken;
};

module.exports = generateTokens;
