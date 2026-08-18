const bookingService = require("../services/booking.service");

// CREATE

const createBookingController = async (req, res) => {
  try {
    const booking = await bookingService.createBooking({
      userId: req.user.id,
      ...req.body,
    });

    res.status(201).json({
      success: true,

      booking,
    });
  } catch (error) {
    res.status(400).json({
      message: error.message,
    });
  }
};

// MY BOOKINGS

const getMyBookingsController = async (req, res) => {
  try {
    const bookings = await bookingService.getMyBookings(req.user.id);
    res.json(bookings);
  } catch (error) {
    res.status(500).json({
      message: error.message,
    });
  }
};

// GET BY ID

const getBookingByIdController = async (req, res) => {
  try {
    const booking = await bookingService.getBookingById(
      Number(req.params.id),
      req.user.id,
      req.user.role,
    );

    res.json(booking);
  } catch (error) {
    const status = error.message === "Booking not found" ? 404 : 403;

    res.status(status).json({
      message: error.message,
    });
  }
};

// CANCEL

const cancelBookingController = async (req, res) => {
  try {
    const booking = await bookingService.cancelBooking(
      Number(req.params.id),
      req.user.id,
    );

    res.json(booking);
  } catch (error) {
    res.status(400).json({
      message: error.message,
    });
  }
};

// CONFIRM

const confirmBookingController = async (req, res) => {
  try {
    const booking = await bookingService.confirmBooking(
      Number(req.params.id),
      req.user.role,
    );

    res.json(booking);
  } catch (error) {
    res.status(400).json({
      message: error.message,
    });
  }
};

// CHECK IN

const checkInBookingController = async (req, res) => {
  try {
    const booking = await bookingService.checkInBooking(
      Number(req.params.id),
      req.user.role,
    );

    res.json(booking);
  } catch (error) {
    res.status(400).json({
      message: error.message,
    });
  }
};

// GYM BOOKINGS

const getGymBookingsController = async (req, res) => {
  try {
    const bookings = await bookingService.getGymBookings(
      Number(req.params.gymId),
    );

    res.json(bookings);
  } catch (error) {
    res.status(404).json({
      message: error.message,
    });
  }
};

// STATS

const getBookingStatsController = async (req, res) => {
  try {
    const stats = await bookingService.getBookingStats();
    res.json(stats);
  } catch (error) {
    res.status(500).json({
      message: error.message,
    });
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
