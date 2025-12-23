const jwt = require('jsonwebtoken');
const User = require('../models/User');

// Protect routes - verify JWT token or session
const protect = async (req, res, next) => {
    let token;

    // Check for JWT token in Authorization header
    if (
        req.headers.authorization &&
        req.headers.authorization.startsWith('Bearer')
    ) {
        token = req.headers.authorization.split(' ')[1];
    }
    // Check for session
    else if (req.session && req.session.userId) {
        try {
            const user = await User.findById(req.session.userId);
            if (user && user.isActive) {
                req.user = user;
                return next();
            }
        } catch (error) {
            return res.status(401).json({ message: 'Not authorized, session invalid' });
        }
    }

    // If no token and no session
    if (!token) {
        return res.status(401).json({ message: 'Not authorized, no token' });
    }

    try {
        // Verify JWT token
        const decoded = jwt.verify(token, process.env.JWT_SECRET);

        // Get user from token
        req.user = await User.findById(decoded.id);

        if (!req.user || !req.user.isActive) {
            return res.status(401).json({ message: 'Not authorized, user not found or inactive' });
        }

        next();
    } catch (error) {
        console.error('Auth error:', error);
        return res.status(401).json({ message: 'Not authorized, token failed' });
    }
};

module.exports = { protect };
