const express = require("express");
const router = express.Router();

const { protect } = require("../middleware/auth.middleware");

const { getSessionsController } = require("../controllers/session.controller");

const {
  createSessionReviewController,
} = require("../controllers/review.controller");

router.get("/", protect, getSessionsController);

router.post("/:id/review", protect, createSessionReviewController);

module.exports = router;
