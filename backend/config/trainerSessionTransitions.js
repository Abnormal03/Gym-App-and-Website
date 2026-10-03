const TRAINER_SESSION_STATUSES = [
  "PENDING_PAYMENT",
  "CONFIRMED",
  "PAYMENT_FAILED",
  "COMPLETED",
  "CANCELLED",
];

const allowedTrainerSessionTransitions = {
  PENDING_PAYMENT: ["CONFIRMED", "PAYMENT_FAILED", "CANCELLED"],

  PAYMENT_FAILED: ["CONFIRMED", "PAYMENT_FAILED", "CANCELLED"],

  CONFIRMED: ["COMPLETED", "CANCELLED"],

  COMPLETED: [],

  CANCELLED: [],
};

const trainerSessionTransitionsFromPayment = {
  PENDING_PAYMENT: {
    success: "CONFIRMED",
    failed: "PAYMENT_FAILED",
  },

  PAYMENT_FAILED: {
    success: "CONFIRMED",
    failed: "PAYMENT_FAILED",
  },

  CONFIRMED: {
    success: "CONFIRMED",
  },
};

module.exports = {
  TRAINER_SESSION_STATUSES,
  allowedTrainerSessionTransitions,
  trainerSessionTransitionsFromPayment,
};
