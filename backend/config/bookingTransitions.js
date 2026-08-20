const BOOKING_STATUSES = [
  "pending",
  "confirmed",
  "payment_failed",
  "checked_in",
  "cancelled",
];

const allowedTransitions = {
  pending: ["confirmed", "cancelled", "payment_failed"],
  payment_failed: ["confirmed", "cancelled", "payment_failed"],
  confirmed: ["checked_in", "cancelled"],
  checked_in: [],
  cancelled: [],
};

const bookingTransitionsFromPayment = {
  pending: { success: "confirmed", failed: "payment_failed" },
  payment_failed: { success: "confirmed", failed: "payment_failed" },
  confirmed: { success: "confirmed" },
};

module.exports = {
  BOOKING_STATUSES,
  allowedTransitions,
  bookingTransitionsFromPayment,
};
