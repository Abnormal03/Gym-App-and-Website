const bookingService = require("../services/booking.service");

// Validate ID helper
const validateId = (id) => {
  const numberId = Number(id);

  if (!Number.isInteger(numberId) || numberId <= 0) {
    throw new Error("Invalid ID");
  }

  return numberId;
};

// Error handler
const handleError = (res, error) => {
  console.error(error.message);

  switch (error.message) {
    case "Gym not found":
    case "Package not found":
    case "Package not found for this gym":
    case "Booking not found":
      return res.status(404).json({
        success: false,
        message: error.message,
      });

    case "Invalid ID":
    case "Invalid booking date":
    case "slotStart must be before slotEnd":
    case "Selected slot is fully booked":
      return res.status(400).json({
        success: false,
        message: error.message,
      });

    case "Access denied":
    case "Admin access required":
      return res.status(403).json({
        success: false,
        message: error.message,
      });

    default:
      return res.status(500).json({
        success: false,
        message: "Internal server error",
      });
  }
};

// CREATE BOOKING
const createBookingController = async (req, res) => {
  try {
    const booking = await bookingService.createBooking({
      userId: req.user.id,
      ...req.body,
    });

    return res.status(201).json({
      success: true,
      booking,
    });
  } catch (error) {
    return handleError(res, error);
  }
};

// GET MY BOOKINGS
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

// GET BOOKING BY ID
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

// CANCEL BOOKING
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

// CONFIRM BOOKING
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

// CHECK-IN BOOKING
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

// GET BOOKINGS FOR A GYM
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

// GET BOOKING STATISTICS
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
