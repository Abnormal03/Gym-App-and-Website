const sessionService = require("../services/session.service");

const getSessionsController = async (req, res) => {
  try {
    const sessions = await sessionService.getSessions(
      req.user.id,
      req.user.role,
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

module.exports = { getSessionsController };
