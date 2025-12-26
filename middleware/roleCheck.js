// Middleware to check if user has required role(s)
const checkRole = (...roles) => {
    return (req, res, next) => {
        if (!req.user) {
            return res.status(401).json({ message: 'Not authenticated' });
        }

        if (!roles.includes(req.user.role)) {
            return res.status(403).json({
                message: `User role '${req.user.role}' is not authorized to access this route`
            });
        }

        next();
    };
};

// Middleware to check if user has role OR is special faculty
const checkSpecialFacultyOrRole = (...roles) => {
    return (req, res, next) => {
        if (!req.user) {
            return res.status(401).json({ message: 'Not authenticated' });
        }

        // Allow if user has special faculty privilege or matches required role
        if (req.user.isSpecialFaculty || roles.includes(req.user.role)) {
            return next();
        }

        return res.status(403).json({
            message: 'Not authorized to access this route'
        });
    };
};

module.exports = { checkRole, checkSpecialFacultyOrRole };
