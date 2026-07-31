const express = require("express");

const router = express.Router();

const {
  createBookingController,
  getMyBookingsController,
  getBookingByIdController,
  cancelBookingController,
  confirmBookingController,
  checkInBookingController,
  getGymBookingsController,
  getBookingStatsController,
} = require("../controllers/booking.controller");

const { protect, adminOnly } = require("../middleware/auth.middleware");

// USER

router.post("/", protect, createBookingController);
router.get("/my-bookings", protect, getMyBookingsController);

// ADMIN

router.get("/stats", protect, adminOnly, getBookingStatsController);
router.get("/gym/:gymId", protect, adminOnly, getGymBookingsController);

// BOOKING

router.get("/:id", protect, getBookingByIdController);
router.put("/:id/cancel", protect, cancelBookingController);
router.put("/:id/confirm", protect, adminOnly, confirmBookingController);
router.put("/:id/check-in", protect, adminOnly, checkInBookingController);

module.exports = router;
