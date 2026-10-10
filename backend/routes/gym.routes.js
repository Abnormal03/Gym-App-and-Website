const express = require("express");
const router = express.Router();

const {
  GetGyms,
  getGymDetails,
  addGym,
  updateGym,
  checkAvailability,
  searchGyms,
} = require("../controllers/gym.controller");

const { protect, adminOnly } = require("../middleware/auth.middleware");

router.get("/", protect, GetGyms);
router.get("/search", protect, searchGyms);

router.get("/:id/availability", protect, checkAvailability);
router.get("/:id", protect, getGymDetails);

router.post("/", protect, adminOnly, addGym);
router.put("/:id", protect, adminOnly, updateGym);

module.exports = router;
