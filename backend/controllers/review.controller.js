const { createSessionReview, getMemberSessionReviews } = require("../services/review.service");

const getMemberSessionReviewsController = async (req, res, next) => {
  try {
    const reviews = await getMemberSessionReviews(req.user.id);
    return res.status(200).json({ success: true, reviews });
  } catch (error) {
    if (error.code === "BAD_REQUEST") {
      return res.status(400).json({ success: false, message: error.message });
    }
    return next(error);
  }
};

const createSessionReviewController = async (req, res, next) => {
  try {
    if (String(req.user.role || "").toUpperCase() !== "MEMBER") {
      return res.status(403).json({
        success: false,
        message: "Only members can review sessions",
      });
    }

    const result = await createSessionReview(
      req.user.id,
      req.params.id,
      req.body,
    );

    return res.status(201).json({
      success: true,
      message: "Review submitted successfully",
      ...result,
    });
  } catch (error) {
    if (error.code === "BAD_REQUEST") {
      return res.status(400).json({
        success: false,
        message: error.message,
      });
    }

    if (error.code === "NOT_FOUND") {
      return res.status(404).json({
        success: false,
        message: error.message,
      });
    }

    if (error.code === "FORBIDDEN") {
      return res.status(403).json({
        success: false,
        message: error.message,
      });
    }

    if (error.code === "ALREADY_EXISTS") {
      return res.status(409).json({
        success: false,
        message: error.message,
      });
    }

    return next(error);
  }
};

module.exports = { createSessionReviewController, getMemberSessionReviewsController };
