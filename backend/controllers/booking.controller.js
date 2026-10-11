const bookingService = require("../services/booking.service");

const validateId = (id) => {
  const numberId = Number(id);

  if (!Number.isInteger(numberId) || numberId <= 0) {
    throw new Error("Invalid ID");
  }

  return numberId;
};

const handleError = (res, error) => {
  console.error("Booking controller error:", error.message);

  const badRequestErrors = [
    "Invalid ID",
    "Invalid user ID",
    "Invalid gym ID",
    "Invalid package ID",
    "Invalid booking ID",
    "Headcount must be a positive integer",
    "Invalid booking date",
    "slotStart must be before slotEnd",
    "Booking start must be in the future",
    "Selected slot is fully booked",
    "Gym is not active",
    "Package is not active",
  ];

  const notFoundErrors = [
    "Gym not found",
    "Package not found",
    "Package not found for this gym",
    "Booking not found",
  ];

  if (notFoundErrors.includes(error.message)) {
    return res.status(404).json({
      success: false,
      message: error.message,
    });
  }

  if (badRequestErrors.includes(error.message)) {
    return res.status(400).json({
      success: false,
      message: error.message,
    });
  }

  if (
    error.message === "Access denied" ||
    error.message === "Admin access required"
  ) {
    return res.status(403).json({
      success: false,
      message: error.message,
    });
  }

  if (error.message.startsWith("Cannot change booking from")) {
    return res.status(409).json({
      success: false,
      message: error.message,
    });
  }

  return res.status(500).json({
    success: false,
    message: "Internal server error",
  });
};

const createBookingController = async (req, res) => {
  try {
    const booking = await bookingService.createBooking({
      ...req.body,
      userId: req.user.id,
    });

    return res.status(201).json({
      success: true,
      booking,
    });
  } catch (error) {
    return handleError(res, error);
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

module.exports = {
  createBookingController,
  getMyBookingsController,
  getBookingByIdController,
  cancelBookingController,
  confirmBookingController,
  checkInBookingController,
  getGymBookingsController,
  getBookingStatsController,
};
