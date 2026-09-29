const express = require('express');
const { gymPackages, createPackage, updatePackage, deletePackage, gymPackagesForAdmin } = require('../controllers/packages.controller');
const { protect, adminOnly } = require('../middleware/auth.middleware');
const { verifyGymOwner, verifyPackageOwner } = require('../middleware/packages.middleware');
const router = express.Router();

router.get('/', protect, gymPackages);
router.get('/admin', protect, adminOnly, gymPackagesForAdmin);
router.post('/', protect, adminOnly, verifyGymOwner, createPackage);
router.put('/:id', protect, adminOnly, verifyPackageOwner, updatePackage);
router.delete('/:id', protect, adminOnly, verifyPackageOwner, deletePackage)

module.exports = router;