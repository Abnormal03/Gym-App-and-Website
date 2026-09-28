const express = require("express");

const {
  registerTrainer,
  loginTrainer,
  getTrainerProfile,
  updateTrainerProfileController,

  addAvailability,
  getAvailability,
  editAvailability,
  removeAvailability,

  browseTrainers,
  getPublicTrainer,

  bookTrainer,
  getMyTrainerSessions,
  changeTrainerSessionStatusController,
  cancelTrainerSessionController,

  createTrainerReviewController,
  getTrainerReviewsController,
} = require("../controllers/trainer.controller.js");

const { trainerAuth } = require("../middleware/trainer.middleware.js");

const { protect } = require("../middleware/auth.middleware.js");

const router = express.Router();

// Public

router.post("/register", registerTrainer);

router.post("/login", loginTrainer);

// Protected trainer routes

router.get("/profile", trainerAuth, getTrainerProfile);

router.put("/profile", trainerAuth, updateTrainerProfileController);

// Trainer availability routes

router.post("/availability", trainerAuth, addAvailability);

router.get("/availability", trainerAuth, getAvailability);

router.put("/availability/:id", trainerAuth, editAvailability);

router.delete("/availability/:id", trainerAuth, removeAvailability);

// Public trainer browsing

router.get("/", browseTrainers);

router.get("/my-sessions", protect, getMyTrainerSessions);

// Trainer reviews

router.post("/:id/reviews", protect, createTrainerReviewController);

router.get("/:id/reviews", getTrainerReviewsController);

router.get("/:id", getPublicTrainer);

// Member books trainer

router.post("/:id/book", protect, bookTrainer);

// Trainer session status

router.put(
  "/sessions/:id/status",
  trainerAuth,
  changeTrainerSessionStatusController,
);

// Member cancels trainer session

router.delete("/sessions/:id", protect, cancelTrainerSessionController);

module.exports = router;
