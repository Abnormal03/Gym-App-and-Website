const express = require("express");

const {
  getMe,
  updateMe,
  deleteMe,
  changePassword,
  updateUserPreference,
  getPreference,
} = require("../controllers/user.controller.js");

const { protect } = require("../middleware/auth.middleware.js");

const router = express.Router();

router.get("/me", protect, getMe);
router.put("/me", protect, updateMe);
router.delete("/me", protect, deleteMe);
router.put("/change-password", protect, changePassword);
router.put("/preference", protect, updateUserPreference);
router.get("/preference", protect, getPreference);

module.exports = router;
