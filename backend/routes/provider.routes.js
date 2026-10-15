const express = require("express");
const router = express.Router();

const {
  searchProviders,
  getProviderPackages,
  getProviderAvailability,
  getMemberProviderDetailController,
} = require("../controllers/provider.controller");

const {
  getProviderReviewsController,
} = require("../controllers/providerReview.controller");

const { protect, authenticate } = require("../middleware/auth.middleware");

// Search providers by name, type, gym, or specialization.
// GET /api/providers/search
router.get("/search", protect, searchProviders);

// Get a provider's public profile, packages, weekly availability,
// and valid session starts for a requested date window.
// GET /api/providers/:id?startsAt=...&endsAt=...
router.get("/:id", protect, getMemberProviderDetailController);

// Get a provider's active packages.
// GET /api/providers/:id/packages
router.get("/:id/packages", getProviderPackages);

// Get a provider's weekly availability.
// GET /api/providers/:id/availability
router.get("/:id/availability", getProviderAvailability);

// Get a provider's reviews.
// GET /api/providers/:id/reviews
router.get("/:id/reviews", authenticate, getProviderReviewsController);

module.exports = router;
