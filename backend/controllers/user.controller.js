const prisma = require('../config/prisma.js');

// GET /api/users/me
const getMe = async (req, res) => {
    try {
        const user = await prisma.user.findUnique({
            where: { id: req.user.userId },
            select: { id: true, name: true, email: true, phone: true, photoUrl: true, createdAt: true }
        });
        res.json({ success: true, user });
    } catch (error) {
        res.status(500).json({ success: false, message: 'Server error' });
    }
};

// PUT /api/users/me
const updateMe = async (req, res) => {
    try {
        const { name, phone, photoUrl, fcmToken } = req.body;

        const user = await prisma.user.update({
            where: { id: req.user.userId },
            data: { name, phone, photoUrl, fcmToken },
            select: { id: true, name: true, email: true, phone: true, photoUrl: true }
        });

        res.json({ success: true, user });
    } catch (error) {
        res.status(500).json({ success: false, message: 'Server error' });
    }
};

module.exports = {
    updateMe,
    getMe
}