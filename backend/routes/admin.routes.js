const express = require("express");

const {
  getDashboard,
  getAllUsers,
  getUserById,
  deleteUser,
  getAdminProfile,
  searchGyms,
} = require("../controllers/admin.controller.js");

const { protect, adminOnly } = require("../middleware/auth.middleware.js");

const router = express.Router();

// Dashboard
router.get("/dashboard", protect, adminOnly, getDashboard);

// Get all users
router.get("/users", protect, adminOnly, getAllUsers);

// Get single user
router.get("/users/:id", protect, adminOnly, getUserById);

// Delete user
router.delete("/users/:id", protect, adminOnly, deleteUser);

// Get admin profile
router.get("/profile", protect, adminOnly, getAdminProfile);

// Search gyms
router.get("/gyms/search", protect, adminOnly, searchGyms);

module.exports = router;
