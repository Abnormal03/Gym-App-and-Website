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

    const badRequestErrors = ["Invalid session status", "Invalid user ID"];

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

const cancelSessionController = asyncHandler(async (req, res) => {
  const result = await sessionService.cancelSession(req.auth, req.params.id);
  return ok(res, result);
});

module.exports = {
  getSessionsController,
  completeSessionController,
  noShowSessionController,
  cancelSessionController,
};
