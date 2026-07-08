const jwt = require('jsonwebtoken');

// Protects any route that requires a logged-in member
const protect = (req, res, next) => {
    const authHeader = req.headers.authorization;

    if (!authHeader || !authHeader.startsWith('Bearer ')) {
        return res.status(401).json({ success: false, message: 'Not logged in' });
    }

    const token = authHeader.split(' ')[1];

    try {
        const decoded = jwt.verify(token, process.env.JWT_SECRET);
        req.user = decoded;  // { userId, role } now available in all controllers
        next();
    } catch (error) {
        return res.status(401).json({ success: false, message: 'Invalid or expired token' });
    }
};

// Use this on top of protect for admin-only routes
const adminOnly = (req, res, next) => {
    if (req.user.role !== 'gym_admin' && req.user.role !== 'platform_admin') {
        return res.status(403).json({ success: false, message: 'Admin access only' });
    }
    next();
};

module.exports = {
    protect,
    adminOnly
}