const userService = require("../services/user.service.js");

const parseUserId = (value) => {
  const id = Number(value);

  if (!Number.isSafeInteger(id) || id <= 0) {
    return null;
  }

  return id;
};

const handleError = (res, error, operation) => {
  const statusCode = error.statusCode || (error.code === "P2025" ? 404 : 500);

  if (statusCode >= 500) {
    console.error(`${operation}:`, error);
  }

  return res.status(statusCode).json({
    success: false,
    message:
      statusCode < 500 ? error.message : "An unexpected server error occurred",
  });
};

const getMe = async (req, res) => {
  try {
    const userId = parseUserId(req.user?.id);

    if (!userId) {
      return res.status(401).json({
        success: false,
        message: "Authentication required",
      });
    }

    const user = await userService.getMeService(userId);

    return res.status(200).json({
      success: true,
      user,
    });
  } catch (error) {
    return handleError(res, error, "Get user error");
  }
};

const updateMe = async (req, res) => {
  try {
    const userId = parseUserId(req.user?.id);

    if (!userId) {
      return res.status(401).json({
        success: false,
        message: "Authentication required",
      });
    }

    const user = await userService.updateMeService(userId, req.body || {});

    return res.status(200).json({
      success: true,
      user,
    });
  } catch (error) {
    return handleError(res, error, "Update user error");
  }
};

const changePassword = async (req, res) => {
  try {
    const userId = parseUserId(req.user?.id);

    if (!userId) {
      return res.status(401).json({
        success: false,
        message: "Authentication required",
      });
    }

    const { currentPassword, newPassword } = req.body || {};

    const result = await userService.changePasswordService(
      userId,
      currentPassword,
      newPassword,
    );

    return res.status(200).json({
      success: true,
      message: result.message,
    });
  } catch (error) {
    return handleError(res, error, "Change password error");
  }
};

const updateUserPreference = async (req, res) => {
  try {
    const userId = parseUserId(req.user?.id);

    if (!userId) {
      return res.status(401).json({
        success: false,
        message: "Authentication required",
      });
    }

    const preference = await userService.updateUserPreferenceService(
      userId,
      req.body || {},
    );

    return res.status(200).json({
      success: true,
      preference,
    });
  } catch (error) {
    return handleError(res, error, "Update user preference error");
  }
};

const getPreference = async (req, res) => {
  try {
    const userId = parseUserId(req.user?.id);

    if (!userId) {
      return res.status(401).json({
        success: false,
        message: "Authentication required",
      });
    }

    const preference = await userService.getPreferenceService(userId);

    return res.status(200).json({
      success: true,
      preference,
    });
  } catch (error) {
    return handleError(res, error, "Get preference error");
  }
};

module.exports = {
  updateMe,
  getMe,
  changePassword,
  updateUserPreference,
  getPreference,
};
