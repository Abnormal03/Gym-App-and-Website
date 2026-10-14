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
const adminOnly = requireRole("GYM_ADMIN")


router.get("/", protect, GetGyms);
router.get("/search", protect, searchGyms);

router.get("/:id/leaderboard", protect, getGymStreakLeaderboard);
router.get("/:id/streak-leaderboard", protect, getGymStreakLeaderboard);
router.get("/:id/streakLeaderboard", protect, getGymStreakLeaderboard);
router.get("/:id/availability", protect, checkAvailability);

// B-1: providers at a gym with optional time-window filtering
router.get("/:id/providers", protect, getGymProvidersController);

router.get("/:id", protect, getGymDetails);

router.post("/", protect, adminOnly, addGym);
router.put("/:id", protect, adminOnly, updateGym);

module.exports = router;
