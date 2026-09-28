const jwt = require("jsonwebtoken");
const bcrypt = require("bcryptjs");
const trainerService = require("../services/trainer.service.js");

const {
  createTrainer,
  findTrainerByEmail,
  getTrainerById,
  updateTrainerProfile,

  createAvailability,
  getTrainerAvailability,
  updateAvailability,
  deleteAvailability,

  browseVerifiedTrainers,
  getPublicTrainerProfile,

  changeTrainerSessionStatus,
  cancelTrainerSession,
  getMemberTrainerSessions,
  createTrainerReview,
  getTrainerReviews,
} = require("../services/trainer.service.js");

const generateTrainerToken = (trainer) => {
  return jwt.sign(
    {
      trainerId: trainer.id,
      role: "trainer",
    },
    process.env.JWT_SECRET,
    {
      expiresIn: "7d",
    },
  );
};

const registerTrainer = async (req, res) => {
  try {
    const { name, email, password, bio, specialization, experienceYears } =
      req.body;

    if (!name || !email || !password) {
      return res.status(400).json({
        success: false,
        message: "Name, email and password are required",
      });
    }

    if (password.length < 6) {
      return res.status(400).json({
        success: false,
        message: "Password must be at least 6 characters",
      });
    }

    const trainer = await createTrainer({
      name,
      email,
      password,
      bio,
      specialization,
      experienceYears,
    });

    const token = generateTrainerToken(trainer);

    return res.status(201).json({
      success: true,
      message:
        "Trainer registered successfully. Your account is pending verification.",
      token,
      trainer,
    });
  } catch (error) {
    console.error("Trainer registration error:", error);

    if (error.message === "A trainer with this email already exists") {
      return res.status(409).json({
        success: false,
        message: error.message,
      });
    }

    return res.status(500).json({
      success: false,
      message: "Failed to register trainer",
    });
  }
};

const loginTrainer = async (req, res) => {
  try {
    const { email, password } = req.body;

    if (!email || !password) {
      return res.status(400).json({
        success: false,
        message: "Email and password are required",
      });
    }

    const trainer = await findTrainerByEmail(email);

    if (!trainer) {
      return res.status(401).json({
        success: false,
        message: "Invalid email or password",
      });
    }

    const passwordMatch = await bcrypt.compare(password, trainer.passwordHash);

    if (!passwordMatch) {
      return res.status(401).json({
        success: false,
        message: "Invalid email or password",
      });
    }

    const token = generateTrainerToken(trainer);

    return res.status(200).json({
      success: true,
      message: "Trainer login successful",
      token,
      trainer: {
        id: trainer.id,
        name: trainer.name,
        email: trainer.email,
        bio: trainer.bio,
        specialization: trainer.specialization,
        experienceYears: trainer.experienceYears,
        profilePhotoUrl: trainer.profilePhotoUrl,
        sessionPrice: trainer.sessionPrice,
        gymId: trainer.gymId,
        verificationStatus: trainer.verificationStatus,
        rating: trainer.rating,
      },
    });
  } catch (error) {
    console.error("Trainer login error:", error);

    return res.status(500).json({
      success: false,
      message: "Failed to login trainer",
    });
  }
};

const getTrainerProfile = async (req, res) => {
  try {
    const trainer = await getTrainerById(req.user.trainerId);

    if (!trainer) {
      return res.status(404).json({
        success: false,
        message: "Trainer not found",
      });
    }

    return res.status(200).json({
      success: true,
      trainer,
    });
  } catch (error) {
    console.error("Get trainer profile error:", error);

    return res.status(500).json({
      success: false,
      message: "Failed to get trainer profile",
    });
  }
};

const updateTrainerProfileController = async (req, res) => {
  try {
    const trainer = await updateTrainerProfile(req.user.trainerId, req.body);

    return res.status(200).json({
      success: true,
      message: "Trainer profile updated successfully",
      trainer,
    });
  } catch (error) {
    console.error("Update trainer profile error:", error);

    return res.status(500).json({
      success: false,
      message: "Failed to update trainer profile",
    });
  }
};

const addAvailability = async (req, res) => {
  try {
    const { dayOfWeek, startTime, endTime } = req.body;

    if (dayOfWeek === undefined || !startTime || !endTime) {
      return res.status(400).json({
        success: false,
        message: "dayOfWeek, startTime and endTime are required",
      });
    }

    const day = Number(dayOfWeek);

    if (!Number.isInteger(day) || day < 0 || day > 6) {
      return res.status(400).json({
        success: false,
        message: "dayOfWeek must be an integer between 0 and 6",
      });
    }

    const availability = await createAvailability({
      trainerId: req.user.trainerId,
      dayOfWeek: day,
      startTime,
      endTime,
    });

    return res.status(201).json({
      success: true,
      message: "Trainer availability added successfully",
      availability,
    });
  } catch (error) {
    console.error("Add availability error:", error);

    if (error.message === "Start time must be before end time") {
      return res.status(400).json({
        success: false,
        message: error.message,
      });
    }

    return res.status(500).json({
      success: false,
      message: "Failed to add trainer availability",
    });
  }
};

const getAvailability = async (req, res) => {
  try {
    const availability = await getTrainerAvailability(req.user.trainerId);

    return res.status(200).json({
      success: true,
      availability,
    });
  } catch (error) {
    console.error("Get availability error:", error);

    return res.status(500).json({
      success: false,
      message: "Failed to get trainer availability",
    });
  }
};

const editAvailability = async (req, res) => {
  try {
    const availabilityId = Number(req.params.id);

    if (!Number.isInteger(availabilityId)) {
      return res.status(400).json({
        success: false,
        message: "Invalid availability ID",
      });
    }

    const { dayOfWeek, startTime, endTime } = req.body;

    if (dayOfWeek === undefined || !startTime || !endTime) {
      return res.status(400).json({
        success: false,
        message: "dayOfWeek, startTime and endTime are required",
      });
    }

    const day = Number(dayOfWeek);

    if (!Number.isInteger(day) || day < 0 || day > 6) {
      return res.status(400).json({
        success: false,
        message: "dayOfWeek must be an integer between 0 and 6",
      });
    }

    const availability = await updateAvailability({
      availabilityId,
      trainerId: req.user.trainerId,
      dayOfWeek: day,
      startTime,
      endTime,
    });

    return res.status(200).json({
      success: true,
      message: "Trainer availability updated successfully",
      availability,
    });
  } catch (error) {
    console.error("Update availability error:", error);

    if (error.message === "Availability not found") {
      return res.status(404).json({
        success: false,
        message: error.message,
      });
    }

    if (error.message === "Start time must be before end time") {
      return res.status(400).json({
        success: false,
        message: error.message,
      });
    }

    return res.status(500).json({
      success: false,
      message: "Failed to update trainer availability",
    });
  }
};

const removeAvailability = async (req, res) => {
  try {
    const availabilityId = Number(req.params.id);

    if (!Number.isInteger(availabilityId)) {
      return res.status(400).json({
        success: false,
        message: "Invalid availability ID",
      });
    }

    await deleteAvailability({
      availabilityId,
      trainerId: req.user.trainerId,
    });

    return res.status(200).json({
      success: true,
      message: "Trainer availability deleted successfully",
    });
  } catch (error) {
    console.error("Delete availability error:", error);

    if (error.message === "Availability not found") {
      return res.status(404).json({
        success: false,
        message: error.message,
      });
    }

    return res.status(500).json({
      success: false,
      message: "Failed to delete trainer availability",
    });
  }
};

const browseTrainers = async (req, res) => {
  try {
    const { specialization, minPrice, maxPrice } = req.query;

    let parsedMinPrice;
    let parsedMaxPrice;

    if (minPrice !== undefined) {
      parsedMinPrice = Number(minPrice);

      if (Number.isNaN(parsedMinPrice) || parsedMinPrice < 0) {
        return res.status(400).json({
          success: false,
          message: "Invalid minPrice",
        });
      }
    }

    if (maxPrice !== undefined) {
      parsedMaxPrice = Number(maxPrice);

      if (Number.isNaN(parsedMaxPrice) || parsedMaxPrice < 0) {
        return res.status(400).json({
          success: false,
          message: "Invalid maxPrice",
        });
      }
    }

    if (
      parsedMinPrice !== undefined &&
      parsedMaxPrice !== undefined &&
      parsedMinPrice > parsedMaxPrice
    ) {
      return res.status(400).json({
        success: false,
        message: "minPrice cannot be greater than maxPrice",
      });
    }

    const trainers = await browseVerifiedTrainers({
      specialization,
      minPrice: parsedMinPrice,
      maxPrice: parsedMaxPrice,
    });

    return res.status(200).json({
      success: true,
      trainers,
    });
  } catch (error) {
    console.error("Browse trainers error:", error);

    return res.status(500).json({
      success: false,
      message: "Failed to browse trainers",
    });
  }
};

const getPublicTrainer = async (req, res) => {
  try {
    const trainerId = Number(req.params.id);

    if (!Number.isInteger(trainerId)) {
      return res.status(400).json({
        success: false,
        message: "Invalid trainer ID",
      });
    }

    const trainer = await getPublicTrainerProfile(trainerId);

    if (!trainer) {
      return res.status(404).json({
        success: false,
        message: "Verified trainer not found",
      });
    }

    return res.status(200).json({
      success: true,
      trainer,
    });
  } catch (error) {
    console.error("Get public trainer error:", error);

    return res.status(500).json({
      success: false,
      message: "Failed to get trainer",
    });
  }
};

const bookTrainer = async (req, res) => {
  try {
    // Only members can book trainers
    if (req.user.role !== "member") {
      return res.status(403).json({
        success: false,
        message: "Only members can book trainers",
      });
    }

    const trainerId = Number(req.params.id);

    if (!Number.isInteger(trainerId) || trainerId <= 0) {
      return res.status(400).json({
        success: false,
        message: "Invalid trainer ID",
      });
    }

    const { startTime, endTime } = req.body;

    if (!startTime || !endTime) {
      return res.status(400).json({
        success: false,
        message: "startTime and endTime are required",
      });
    }

    const session = await trainerService.createTrainerBooking({
      trainerId,
      memberId: req.user.id,
      startTime,
      endTime,
    });

    return res.status(201).json({
      success: true,
      message:
        "Trainer session created successfully. Complete payment to confirm the session.",
      session,
    });
  } catch (error) {
    console.error("BOOK TRAINER ERROR:", error);

    switch (error.message) {
      case "Invalid trainer ID":
      case "Invalid member ID":
      case "Invalid booking date":
      case "startTime must be before endTime":
      case "Trainer sessions must be booked for a future time":
        return res.status(400).json({
          success: false,
          message: error.message,
        });

      case "Trainer not found":
        return res.status(404).json({
          success: false,
          message: error.message,
        });

      case "Trainer is not available for booking":
      case "Trainer has not set a session price":
      case "Trainer is not available during the selected time":
      case "Trainer already has a session during the selected time":
        return res.status(409).json({
          success: false,
          message: error.message,
        });

      default:
        return res.status(500).json({
          success: false,
          message: "Internal server error",
        });
    }
  }
};

const changeTrainerSessionStatusController = async (req, res) => {
  try {
    const sessionId = Number(req.params.id);
    const { status } = req.body;

    if (!Number.isInteger(sessionId) || sessionId <= 0) {
      return res.status(400).json({
        success: false,
        message: "Invalid session ID",
      });
    }

    if (!status) {
      return res.status(400).json({
        success: false,
        message: "Status is required",
      });
    }

    const session = await trainerService.changeTrainerSessionStatus(
      sessionId,
      status,
    );

    return res.status(200).json({
      success: true,
      message: "Trainer session status updated successfully",
      session,
    });
  } catch (error) {
    console.error("Change trainer session status error:", error);

    if (error.message === "Invalid session ID") {
      return res.status(400).json({
        success: false,
        message: error.message,
      });
    }

    if (error.message === "Trainer session not found") {
      return res.status(404).json({
        success: false,
        message: error.message,
      });
    }

    if (
      error.message.startsWith("Cannot change trainer session") ||
      error.message.startsWith("Unknown current session status")
    ) {
      return res.status(400).json({
        success: false,
        message: error.message,
      });
    }

    return res.status(500).json({
      success: false,
      message: "Failed to update trainer session status",
    });
  }
};

const cancelTrainerSessionController = async (req, res) => {
  try {
    const sessionId = Number(req.params.id);

    if (!Number.isInteger(sessionId) || sessionId <= 0) {
      return res.status(400).json({
        success: false,
        message: "Invalid session ID",
      });
    }

    const session = await trainerService.cancelTrainerSession(
      sessionId,
      req.user.id,
    );

    return res.status(200).json({
      success: true,
      message: "Trainer session cancelled successfully",
      session,
    });
  } catch (error) {
    console.error("Cancel trainer session error:", error);

    if (error.message === "Invalid session ID") {
      return res.status(400).json({
        success: false,
        message: error.message,
      });
    }

    if (error.message === "Trainer session not found") {
      return res.status(404).json({
        success: false,
        message: error.message,
      });
    }

    if (error.message === "Access denied") {
      return res.status(403).json({
        success: false,
        message: error.message,
      });
    }

    if (error.message.startsWith("Cannot change trainer session")) {
      return res.status(400).json({
        success: false,
        message: error.message,
      });
    }

    return res.status(500).json({
      success: false,
      message: "Failed to cancel trainer session",
    });
  }
};

const getMyTrainerSessions = async (req, res) => {
  try {
    const sessions = await trainerService.getMemberTrainerSessions(req.user.id);

    return res.status(200).json({
      success: true,
      sessions,
    });
  } catch (error) {
    console.error("Get member trainer sessions error:", error);

    return res.status(500).json({
      success: false,
      message: "Failed to get trainer sessions",
    });
  }
};

const createTrainerReviewController = async (req, res) => {
  try {
    // Only members can submit trainer reviews
    if (req.user.role !== "member") {
      return res.status(403).json({
        success: false,
        message: "Only members can submit trainer reviews",
      });
    }

    const trainerId = Number(req.params.id);
    const memberId = Number(req.user.id);

    if (!Number.isInteger(trainerId) || trainerId <= 0) {
      return res.status(400).json({
        success: false,
        message: "Invalid trainer ID",
      });
    }

    const { sessionId, rating, review } = req.body;

    if (sessionId === undefined) {
      return res.status(400).json({
        success: false,
        message: "sessionId is required",
      });
    }

    if (rating === undefined) {
      return res.status(400).json({
        success: false,
        message: "rating is required",
      });
    }

    const createdReview = await createTrainerReview({
      trainerId,
      memberId,
      sessionId,
      rating,
      review,
    });

    return res.status(201).json({
      success: true,
      message: "Trainer review submitted successfully",
      review: createdReview,
    });
  } catch (error) {
    console.error("Create trainer review error:", error);

    switch (error.message) {
      case "Invalid trainer, member, or session ID":
      case "Rating must be an integer between 1 and 5":
      case "You can only review a completed training session":
        return res.status(400).json({
          success: false,
          message: error.message,
        });

      case "Trainer not found":
        return res.status(404).json({
          success: false,
          message: error.message,
        });

      case "Training session not found or you are not authorized to review this session":
        return res.status(403).json({
          success: false,
          message: error.message,
        });

      case "This training session has already been reviewed":
        return res.status(409).json({
          success: false,
          message: error.message,
        });

      default:
        return res.status(500).json({
          success: false,
          message: "Failed to submit trainer review",
        });
    }
  }
};

const getTrainerReviewsController = async (req, res) => {
  try {
    const trainerId = Number(req.params.id);

    if (!Number.isInteger(trainerId) || trainerId <= 0) {
      return res.status(400).json({
        success: false,
        message: "Invalid trainer ID",
      });
    }

    const result = await getTrainerReviews(trainerId);

    return res.status(200).json({
      success: true,
      reviews: result.reviews,
      averageRating: result.averageRating,
      reviewCount: result.reviewCount,
    });
  } catch (error) {
    console.error("Get trainer reviews error:", error);

    if (error.message === "Invalid trainer ID") {
      return res.status(400).json({
        success: false,
        message: error.message,
      });
    }

    if (error.message === "Trainer not found") {
      return res.status(404).json({
        success: false,
        message: error.message,
      });
    }

    return res.status(500).json({
      success: false,
      message: "Failed to get trainer reviews",
    });
  }
};

module.exports = {
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

  changeTrainerSessionStatusController,
  cancelTrainerSessionController,
  getMyTrainerSessions,

  createTrainerReviewController,
  getTrainerReviewsController,
};
