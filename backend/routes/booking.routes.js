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
  getMemberBookingsController,
  cancelMemberBookingController,
  addSessionToBookingController,
} = require("../controllers/booking.controller");

const { protect, requireRole } = require("../middleware/auth.middleware");
const { verifyGymOwner } = require("../middleware/gym.middleware");

const adminOnly = requireRole("GYM_ADMIN");

router.post("/", protect, createBookingController);

// B4: Member bookings with optional status filter.
// Register this before "/:id".
router.get("/", protect, getMemberBookingsController);

// Existing booking endpoints
router.get("/my-bookings", protect, getMyBookingsController);
router.get("/stats", protect, adminOnly, getBookingStatsController);

router.get(
  "/gym/:gymId",
  protect,
  adminOnly,
  verifyGymOwner,
  getGymBookingsController,
);

// B4: Add a training session to a booking.
router.post("/:bookingId/sessions", protect, addSessionToBookingController);

// B4: Member cancellation with session-credit handling.
router.post("/:id/cancel", protect, cancelMemberBookingController);

// Existing V1 routes
router.get("/:id", protect, getBookingByIdController);
router.put("/:id/cancel", protect, cancelBookingController);
router.put("/:id/confirm", protect, adminOnly, confirmBookingController);
router.put("/:id/check-in", protect, adminOnly, checkInBookingController);

module.exports = router;
