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
} = require("../controllers/admin.controller.js");

const { protect, adminOnly } = require("../middleware/auth.middleware.js");

const router = express.Router();

router.get("/dashboard", protect, adminOnly, getDashboard);

router.get("/users", protect, adminOnly, getAllUsers);

router.get("/users/:id", protect, adminOnly, getUserById);

router.delete("/users/:id", protect, adminOnly, deleteUser);

router.get("/profile", protect, adminOnly, getAdminProfile);

router.get("/trainers/pending", protect, adminOnly, getPendingTrainers);

router.get("/trainers/:id", protect, adminOnly, getTrainerForVerification);

router.patch("/trainers/:id/verify", protect, adminOnly, verifyTrainer);

router.patch("/trainers/:id/reject", protect, adminOnly, rejectTrainer);

module.exports = router;
