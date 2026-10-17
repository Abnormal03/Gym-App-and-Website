const bookingService = require("../services/booking.service");

const validateId = (id) => {
  const numberId = Number(id);

  if (!Number.isInteger(numberId) || numberId <= 0) {
    throw new Error("Invalid ID");
  }

  return numberId;
};

const requireMember = (req) => {
  if (String(req.user?.role || "").toUpperCase() !== "MEMBER") {
    throw new Error("Member access required");
  }
};

const handleError = (res, error) => {
  console.error("Booking controller error:", error.message);

  const message = error.message || "";

  const notFoundErrors = [
    "Gym not found",
    "Package not found",
    "Package not found for this gym",
    "Booking not found",
    "Provider not found",
    "Package purchase not found",
  ];

  const badRequestErrors = [
    "Invalid ID",
    "Invalid user ID",
    "Invalid gym ID",
    "Invalid package ID",
    "Invalid booking ID",
    "Invalid purchase ID",
    "Invalid session start time",
    "Invalid booking status filter",
    "Invalid session status filter",
    "Headcount must be a positive integer",
    "Invalid booking date",
    "slotStart must be before slotEnd",
    "Booking start must be in the future",
    "Selected slot is fully booked",
    "Gym is not active",
    "Package is not active",
    "Booking cannot be cancelled after its start time",
    "Only pending or confirmed bookings can be cancelled",
    "Booking must be confirmed before adding a session",
    "Cannot add a session to a booking that has started",
    "This package purchase does not belong to you",
    "Package purchase is not active",
    "Package purchase has expired",
    "Provider is not active",
    "Provider and booking must belong to the same gym",
    "No sessions remaining in this package",
    "Selected session time is not available within this booking window",
    "Invalid session status filter",
  ];

  if (notFoundErrors.includes(message)) {
    return res.status(404).json({
      success: false,
      message,
    });
  }

  if (
    message === "Access denied" ||
    message === "Admin access required" ||
    message === "Member access required" ||
    message === "Only members and providers can access sessions"
  ) {
    return res.status(403).json({
      success: false,
      message,
    });
  }

  if (badRequestErrors.includes(message) || message.startsWith("Invalid ")) {
    return res.status(400).json({
      success: false,
      message,
    });
  }

  if (
    message.startsWith("Cannot change booking from") ||
    message.startsWith("Unknown current status:")
  ) {
    return res.status(409).json({
      success: false,
      message,
    });
  }

  if (
    message.includes("not available") ||
    message.includes("fully booked") ||
    message.includes("No sessions remaining")
  ) {
    return res.status(409).json({
      success: false,
      message,
    });
  }

  return res.status(500).json({
    success: false,
    message: "Internal server error",
  });
};

/* =========================================================
   EXISTING BOOKING CONTROLLERS
   ========================================================= */

const createBookingController = async (req, res) => {
  try {
    const body = req.body || {};

    const gymId = body.gymId ?? body.gym_id;
    const packageId = body.packageId ?? body.package_id ?? null;
    const headcount = body.headcount ?? 1;
    const slotStart = body.slotStart ?? body.slot_start;
    const slotEnd = body.slotEnd ?? body.slot_end;

    if (!gymId) {
      return res.status(400).json({
        success: false,
        message: "gymId is required",
      });
    }

    if (!slotStart || !slotEnd) {
      return res.status(400).json({
        success: false,
        message:
          "A valid available slot is required. Provide slotStart and slotEnd.",
      });
    }

    const booking = await bookingService.createBooking({
      userId: req.user.id,
      gymId: Number(gymId),
      packageId:
        packageId === null || packageId === "" ? null : Number(packageId),
      slotStart,
      slotEnd,
      headcount: Number(headcount),
    });

    return res.status(201).json({
      success: true,
      booking,
    });
  } catch (error) {
    console.error("Create booking controller error:", error);

    const message = error.message || "Internal server error";

    const clientErrors = [
      "Invalid",
      "must be",
      "is required",
      "not found",
      "not active",
      "fully booked",
      "future",
      "before",
      "Headcount",
    ];

    const isClientError = clientErrors.some((prefix) =>
      message.toLowerCase().includes(prefix.toLowerCase()),
    );

    return res.status(isClientError ? 400 : 500).json({
      success: false,
      message: isClientError ? message : "Internal server error",
    });
  }
};

const getMyBookingsController = async (req, res) => {
  try {
    const bookings = await bookingService.getMyBookings(req.user.id);

    return res.status(200).json({
      success: true,
      bookings,
    });
  } catch (error) {
    return handleError(res, error);
  }
};

const getBookingByIdController = async (req, res) => {
  try {
    const booking = await bookingService.getBookingById(
      validateId(req.params.id),
      req.user.id,
      req.user.role,
    );

    return res.status(200).json({
      success: true,
      booking,
    });
  } catch (error) {
    return handleError(res, error);
  }
};

const cancelBookingController = async (req, res) => {
  try {
    const booking = await bookingService.cancelBooking(
      validateId(req.params.id),
      req.user.id,
      req.user.role,
    );

    return res.status(200).json({
      success: true,
      booking,
    });
  } catch (error) {
    return handleError(res, error);
  }
};

const confirmBookingController = async (req, res) => {
  try {
    const booking = await bookingService.confirmBooking(
      validateId(req.params.id),
      req.user.role,
    );

    return res.status(200).json({
      success: true,
      booking,
    });
  } catch (error) {
    return handleError(res, error);
  }
};

const checkInBookingController = async (req, res) => {
  try {
    const booking = await bookingService.checkInBooking(
      validateId(req.params.id),
      req.user.role,
    );

    return res.status(200).json({
      success: true,
      booking,
    });
  } catch (error) {
    return handleError(res, error);
  }
};

const getGymBookingsController = async (req, res) => {
  try {
    const bookings = await bookingService.getGymBookings(
      validateId(req.params.gymId),
    );

    return res.status(200).json({
      success: true,
      bookings,
    });
  } catch (error) {
    return handleError(res, error);
  }
};

const getBookingStatsController = async (req, res) => {
  try {
    const stats = await bookingService.getBookingStats();

    return res.status(200).json({
      success: true,
      stats,
    });
  } catch (error) {
    return handleError(res, error);
  }
};

/* =========================================================
   B4: GET /bookings?status=
   ========================================================= */

const getMemberBookingsController = async (req, res) => {
  try {
    requireMember(req);

    const bookings = await bookingService.getMemberBookings(
      req.user.id,
      req.query.status,
    );

    return res.status(200).json({
      success: true,
      bookings,
    });
  } catch (error) {
    return handleError(res, error);
  }
};

/* =========================================================
   B4: POST /bookings/:id/cancel
   ========================================================= */

const cancelMemberBookingController = async (req, res) => {
  try {
    requireMember(req);

    const booking = await bookingService.cancelMemberBooking(
      validateId(req.params.id),
      req.user.id,
    );

    return res.status(200).json({
      success: true,
      message: "Booking cancelled successfully",
      booking,
    });
  } catch (error) {
    return handleError(res, error);
  }
};

/* =========================================================
   B4: POST /bookings/:bookingId/sessions
   ========================================================= */

const addSessionToBookingController = async (req, res) => {
  try {
    requireMember(req);

    const session = await bookingService.addSessionToBooking(
      validateId(req.params.bookingId),
      req.user.id,
      {
        purchaseId: req.body.purchaseId,
        startsAt: req.body.startsAt,
      },
    );

    return res.status(201).json({
      success: true,
      message: "Training session scheduled successfully",
      session,
    });
  } catch (error) {
    return handleError(res, error);
  }
};

/* =========================================================
   B4: GET /sessions?status=
   ========================================================= */

const getSessionsController = async (req, res) => {
  try {
    const sessions = await bookingService.getSessionsForUser(
      req.user.id,
      req.user.role,
      req.query.status,
    );

    return res.status(200).json({
      success: true,
      sessions,
    });
  } catch (error) {
    return handleError(res, error);
  }
};

module.exports = {
  // Existing exports
  createBookingController,
  getMyBookingsController,
  getBookingByIdController,
  cancelBookingController,
  confirmBookingController,
  checkInBookingController,
  getGymBookingsController,
  getBookingStatsController,

  // B4 exports
  getMemberBookingsController,
  cancelMemberBookingController,
  addSessionToBookingController,
  getSessionsController,
};
