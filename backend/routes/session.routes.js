const express = require("express");
const router = express.Router();

const { protect, requireRole } = require("../middleware/auth.middleware");
const {
  getSessionsController,
  completeSessionController,
  noShowSessionController,
  cancelSessionController,
} = require("../controllers/session.controller");

const bookableProviderRoles = requireRole('TRAINER', 'PHYSIOTHERAPIST');
const cancelRoles = requireRole('MEMBER', 'TRAINER', 'PHYSIOTHERAPIST');

// Member or provider lists sessions
router.get("/", protect, getSessionsController);

// Provider session lifecycle (E-32)
router.post("/:id/complete", ...bookableProviderRoles, completeSessionController);
router.post("/:id/no-show", ...bookableProviderRoles, noShowSessionController);

// Member or provider cancels session (E-33)
router.post("/:id/cancel", ...cancelRoles, cancelSessionController);

module.exports = router;
