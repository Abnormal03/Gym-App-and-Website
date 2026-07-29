const express = require('express');
const { gymPackages, createPackage, updatePackage, deletePackage } = require('../controllers/packages.controller');
const { protect, adminOnly } = require('../middleware/auth.middleware');
const { verifyGymOwner, verifyPackageOwner } = require('../middleware/packages.middleware');
const router = express.Router();

router.get('/', protect, gymPackages);
router.post('/', protect, adminOnly, verifyGymOwner, createPackage);
router.put('/:id', protect, adminOnly, verifyPackageOwner, updatePackage);
router.delete('/:id', protect, adminOnly, verifyPackageOwner, deletePackage)

module.exports = router;