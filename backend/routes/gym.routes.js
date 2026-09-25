const express = require("express");

const {
  GetGyms,
  getGymDetails,
  addGym,
  updateGym,
  checkAvailability,
  searchGyms,
} = require("../controllers/gym.controller");

const { protect, adminOnly } = require("../middleware/auth.middleware");

const router = express.Router();

router.get("/", protect, GetGyms);

router.get("/search", protect, searchGyms);

router.get("/:id", protect, getGymDetails);

router.get("/:id/availability", protect, checkAvailability);

router.post("/", protect, adminOnly, addGym);

router.put("/:id", protect, adminOnly, updateGym);

module.exports = router;
