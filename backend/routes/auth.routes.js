const express = require('express');
const { register, login, adminLogin, providerLogin, staffLogin, changePassword, me } = require('../controllers/auth.controller.js');
const { authenticateAllowingPasswordChange } = require('../middleware/gym.middleware.js');

const router = express.Router();

router.post('/register', register);
router.post('/login', login);
router.post('/admin/login', adminLogin);


//version 2
router.post('/provider/login', providerLogin);
router.post('/staff/login', staffLogin);
router.post('/change-password', authenticateAllowingPasswordChange, changePassword);
router.get('/me', authenticateAllowingPasswordChange, me);

module.exports = router;