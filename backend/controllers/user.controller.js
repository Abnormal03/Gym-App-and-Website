const prisma = require('../config/prisma.js');
const bcrypt = require('bcryptjs');

// GET /api/users/me
const getMe = async (req, res) => {
    try {
        const user = await prisma.user.findUnique({
            where: { id: req.user.id },
            select: {
                id: true, name: true, email: true, phone: true, photoUrl: true, createdAt: true, fcmToken: true, _count: {
                    select: {
                        bookings: {
                            where: {
                                status: {
                                    in: ['confirmed', 'checked_in']
                                }
                            }
                        }
                    }
                }
            }
        });

        const { _count, ...restOfUser } = user;

        res.json({ success: true, user: { ...restOfUser, totalBookings: _count.bookings } });
    } catch (error) {
        console.log('Get User Error: ', error.message);
        res.status(500).json({ success: false, message: 'Server error' });
    }
};

// PUT /api/users/me
const updateMe = async (req, res) => {
    try {
        const { name, phone, photoUrl, fcmToken } = req.body;

        const user = await prisma.user.update({
            where: { id: req.user.id },
            data: { name, phone, photoUrl, fcmToken },
            select: { id: true, name: true, email: true, phone: true, photoUrl: true }
        });

        res.json({ success: true, user });
    } catch (error) {
        res.status(500).json({ success: false, message: 'Server error' });
    }
};


const changePassword = async (req, res) => {
    try {
        const { currentPassword, newPassword } = req.body;
        if (!currentPassword || !newPassword) {
            return res.status(400).json({ success: false, message: 'Please provide current and new password' })
        }

        const user = await prisma.user.findUnique({
            where: { id: req.user.id }
        });

        if (!user) {
            return res.status(404).json({ success: false, message: 'User not found' })
        }

        const isCurrentPasswordValid = await bcrypt.compare(currentPassword, user.password);
        if (!isCurrentPasswordValid) {
            return res.status(400).json({ success: false, message: 'Invalid current password' })
        }

        if (Buffer.byteLength(newPassword, 'utf8') > 72) {
            return res.status(400).json({ success: false, message: 'Password cannot exceed 72 bytes' });
        }

        const hashedPassword = await bcrypt.hash(newPassword, 10);

        await prisma.user.update({
            where: { id: req.user.id },
            data: { password: hashedPassword }
        });

        res.json({ success: true, message: 'Password changed successfully' })

    } catch (error) {
        console.log('Change password error: ', error.message);
        res.status(500).json({ success: false, message: 'Server error' })
    }
}

module.exports = {
    updateMe,
    getMe,
    changePassword
}