const sessionService = require("../services/session.service");
const { ok, asyncHandler } = require("../utils/responses");

const getSessionsController = async (req, res) => {
  try {
    const userId = req.auth?.id || req.user?.id;
    const role = req.auth?.role || req.user?.role;

    const sessions = await sessionService.getSessions(
      userId,
      role,
      req.query.status,
    );

    return res.status(200).json({
      success: true,
      sessions,
    });
  } catch (error) {
    console.error("Get sessions error:", error.message);

    // Matches the exact strings thrown in booking.service.js getSessionsForUser
    const badRequestErrors = [
      "Invalid session status filter", // status query param not in allowed list
      "Invalid user ID",               // validatePositiveId failure
    ];

    if (badRequestErrors.includes(error.message)) {
      return res.status(400).json({
        success: false,
        message: error.message,
      });
    }

    if (error.message === "Session access denied") {
      return res.status(403).json({
        success: false,
        message: error.message,
      });
    }

    return res.status(500).json({
      success: false,
      message: "Internal server error",
    });
  }
};

const completeSessionController = asyncHandler(async (req, res) => {
  const result = await sessionService.completeSession(req.auth, req.params.id);
  return ok(res, result);
});

const noShowSessionController = asyncHandler(async (req, res) => {
  const result = await sessionService.noShowSession(req.auth, req.params.id);
  return ok(res, result);
});

// Accepts optional { reason: string } in the body.
const cancelSessionController = asyncHandler(async (req, res) => {
  const reason = typeof req.body?.reason === "string" ? req.body.reason.trim() : undefined;
  const result = await sessionService.cancelSession(req.auth, req.params.id, reason);
  return ok(res, result);
});

module.exports = {
  getSessionsController,
  completeSessionController,
  noShowSessionController,
  cancelSessionController,
};
