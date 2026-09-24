const express = require('express');
const { getMe, updateMe, changePassword } = require('../controllers/user.controller.js');
const { protect } = require('../middleware/auth.middleware.js');

const router = express.Router();

router.get('/me', protect, getMe);
router.put('/me', protect, updateMe);
router.put('/change-password', protect, changePassword);

module.exports = router;