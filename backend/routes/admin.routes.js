const express = require("express");

const {
  getDashboard,
  getAllUsers,
  getUserById,
  deleteUser,
  getAdminProfile,
} = require("../controllers/admin.controller.js");

const { protect, adminOnly } = require("../middleware/auth.middleware.js");

const router = express.Router();

router.get("/dashboard", protect, adminOnly, getDashboard);

router.get("/users", protect, adminOnly, getAllUsers);

router.get("/users/:id", protect, adminOnly, getUserById);

router.delete("/users/:id", protect, adminOnly, deleteUser);

router.get("/profile", protect, adminOnly, getAdminProfile);

module.exports = router;
