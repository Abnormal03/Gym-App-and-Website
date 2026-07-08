const express = require('express');
const { getMe, updateMe } = require('../controllers/user.controller.js');
const { protect } = require('../middleware/auth.middleware.js');

const router = express.Router();

router.get('/me', protect, getMe);
router.put('/me', protect, updateMe);

module.exports = router;