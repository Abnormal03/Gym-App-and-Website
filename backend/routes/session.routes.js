const express = require("express");
const router = express.Router();

const { protect, requireRole } = require("../middleware/auth.middleware");

const {
  getSessionsController,
  completeSessionController,
  noShowSessionController,
  cancelSessionController,
} = require("../controllers/session.controller");

const {
  createSessionReviewController,
} = require("../controllers/review.controller");

const memberAndProviderRoles = requireRole(
  "MEMBER",
  "TRAINER",
  "PHYSIOTHERAPIST",
);

const bookableProviderRoles = requireRole("TRAINER", "PHYSIOTHERAPIST");

const cancelRoles = requireRole("MEMBER", "TRAINER", "PHYSIOTHERAPIST");

// Member, trainer, or physiotherapist lists sessions.
router.get("/", ...memberAndProviderRoles, getSessionsController);

// Review route remains unchanged for now; we'll check its authentication separately.
router.post("/:id/review", protect, createSessionReviewController);

// Provider session lifecycle.
router.post(
  "/:id/complete",
  ...bookableProviderRoles,
  completeSessionController,
);

router.post("/:id/no-show", ...bookableProviderRoles, noShowSessionController);

// Member or provider cancels a session.
router.post("/:id/cancel", ...cancelRoles, cancelSessionController);

module.exports = router;
