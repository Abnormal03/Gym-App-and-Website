const express = require("express");
const router = express.Router();

const { searchProviders } = require("../controllers/provider.controller");
const {
  getProviderReviewsController,
} = require("../controllers/providerReview.controller");

const { protect, authenticate } = require("../middleware/auth.middleware");

router.get("/search", protect, searchProviders);
router.get("/:id/reviews", authenticate, getProviderReviewsController);

module.exports = router;
