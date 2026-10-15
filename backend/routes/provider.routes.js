const express = require("express");
const router = express.Router();

const {
  searchProviders,
  getProviderPackages,
  getProviderAvailability,
  getMemberProviderDetailController,
  createProviderController,
  listProvidersController,
  getManagedProviderController,
  updateProviderController,
  resetProviderPasswordController,
} = require("../controllers/provider.controller");

const {
  getProviderReviewsController,
} = require("../controllers/providerReview.controller");

const {
  requireRole,
  protect,
  authenticate,
} = require("../middleware/auth.middleware");

const adminOnly = requireRole("GYM_ADMIN");

router.get("/search", protect, searchProviders);
router.post("/", protect, ...adminOnly, createProviderController);
router.get("/admin/manage", protect, ...adminOnly, listProvidersController);

router.get(
  "/admin/manage/:id",
  protect,
  ...adminOnly,
  getManagedProviderController,
);

router.patch(
  "/admin/manage/:id",
  protect,
  ...adminOnly,
  updateProviderController,
);

router.post(
  "/admin/manage/:id/reset-password",
  protect,
  ...adminOnly,
  resetProviderPasswordController,
);

router.get("/:id", protect, getMemberProviderDetailController);

router.get("/:id/packages", getProviderPackages);

router.get("/:id/availability", getProviderAvailability);

router.get("/:id/reviews", authenticate, getProviderReviewsController);

module.exports = router;
