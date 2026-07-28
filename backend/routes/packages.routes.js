const express = require('express');
const { gymPackages, createPackage } = require('../controllers/packages.controller');
const { protect, adminOnly } = require('../middleware/auth.middleware');
const { verifyGymOwner } = require('../middleware/packages.middleware');
const router = express.Router();

router.get('/', protect, gymPackages);
router.post('/', protect, adminOnly, verifyGymOwner, createPackage);

module.exports = router;