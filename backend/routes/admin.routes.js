const express = require("express");

const {
  getDashboard,
  getAllUsers,
  getUserById,
  deleteUser,
  getAdminProfile,

  getPendingTrainers,
  getTrainerForVerification,
  verifyTrainer,
  rejectTrainer,

  getAdminGymsList,
  getAdminRevenueController,
} = require("../controllers/admin.controller.js");

const { protect, requireRole } = require("../middleware/auth.middleware.js");
const adminOnly = requireRole("GYM_ADMIN")

const router = express.Router();


router.get("/dashboard", protect, adminOnly, getDashboard);

// B-3: gyms owned by the calling admin
router.get("/gyms", protect, adminOnly, getAdminGymsList);

// W3 / B-4: per-gym revenue summary
router.get("/revenue", protect, adminOnly, getAdminRevenueController);

router.get("/users", protect, adminOnly, getAllUsers);

router.get("/users/:id", protect, adminOnly, getUserById);

router.delete("/users/:id", protect, adminOnly, deleteUser);

router.get("/profile", protect, adminOnly, getAdminProfile);

const staff = require('../controllers/adminStaff.controller');
const prov = require('../controllers/adminProvider.controller');
const pkg = require('../controllers/adminGymPackage.controller');

router.post('/staff', protect, adminOnly, staff.create);
router.get('/staff', protect, adminOnly, staff.list);              // ?gymId=&isActive=&page=&limit=
router.get('/staff/:id', protect, adminOnly, staff.get);
router.patch('/staff/:id', protect, adminOnly, staff.update);      // name, phone, isActive, gymId
router.post('/staff/:id/reset-password', protect, adminOnly, staff.resetPassword);

router.post('/providers', protect, adminOnly, prov.create);
router.get('/providers', protect, adminOnly, prov.list);           // ?gymId=&type=&isActive=
router.get('/providers/:id', protect, adminOnly, prov.get);        // includes availability + packages
router.patch('/providers/:id', protect, adminOnly, prov.update);   // never type, email or gym
router.post('/providers/:id/reset-password', protect, adminOnly, prov.resetPassword);

router.post('/gym-packages', protect, adminOnly, pkg.create);
router.get('/gym-packages', protect, adminOnly, pkg.list);         // ?gymId=&isActive=
router.get('/gym-packages/:id', protect, adminOnly, pkg.get);
router.patch('/gym-packages/:id', protect, adminOnly, pkg.update);
router.delete('/gym-packages/:id', protect, adminOnly, pkg.deactivate);   // soft delete
router.get("/trainers/pending", protect, adminOnly, getPendingTrainers);

router.get("/trainers/:id", protect, adminOnly, getTrainerForVerification);

router.patch("/trainers/:id/verify", protect, adminOnly, verifyTrainer);

router.patch("/trainers/:id/reject", protect, adminOnly, rejectTrainer);

module.exports = router;
