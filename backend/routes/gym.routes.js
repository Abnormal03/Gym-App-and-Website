const express = require("express");
const router = express.Router();

const {
  GetGyms,
  getGymDetails,
  addGym,
  updateGym,
  checkAvailability,
  searchGyms,
  getGymStreakLeaderboard,
} = require("../controllers/gym.controller");

const {
  getGymProvidersController,
} = require("../controllers/provider.controller");

const { protect, requireRole } = require("../middleware/auth.middleware");

// Only gym admins can create or update gyms.
const adminOnly = requireRole("GYM_ADMIN");

// Get all gyms
router.get("/", protect, GetGyms);

// Search gyms
router.get("/search", protect, searchGyms);

// Gym streak leaderboard
router.get("/:id/leaderboard", protect, getGymStreakLeaderboard);
router.get("/:id/streak-leaderboard", protect, getGymStreakLeaderboard);
router.get("/:id/streakLeaderboard", protect, getGymStreakLeaderboard);

// Check gym availability
router.get("/:id/availability", protect, checkAvailability);

// Get providers belonging to a gym
router.get("/:id/providers", protect, getGymProvidersController);

// Get gym details by ID
router.get("/:id", protect, getGymDetails);

// Create a gym (GYM_ADMIN only)
router.post("/", protect, adminOnly, addGym);

// Update a gym (GYM_ADMIN only)
router.put("/:id", protect, adminOnly, updateGym);

module.exports = router;
