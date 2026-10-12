const express = require("express");
const router = express.Router();

const {
  requireRole,
  PROVIDER_ROLES,
} = require("../middleware/auth.middleware");

const {
  getProviderLeaderboardController,
} = require("../controllers/leaderboard.controller");

router.get(
  "/providers",
  requireRole(...PROVIDER_ROLES, "GYM_ADMIN"),
  getProviderLeaderboardController,
);

module.exports = router;
