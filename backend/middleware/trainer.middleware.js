const jwt = require("jsonwebtoken");

const trainerAuth = (req, res, next) => {
  try {
    const authHeader = req.headers.authorization;

    if (!authHeader || !authHeader.startsWith("Bearer ")) {
      return res.status(401).json({
        success: false,
        message: "Authentication required",
      });
    }

    const token = authHeader.split(" ")[1];

    const decoded = jwt.verify(token, process.env.JWT_SECRET);

    if (decoded.role !== "trainer" || !decoded.trainerId) {
      return res.status(403).json({
        success: false,
        message: "Trainer access required",
      });
    }

    req.user = decoded;

    next();
  } catch (error) {
    console.error("Trainer authentication error:", error);

    return res.status(401).json({
      success: false,
      message: "Invalid or expired trainer token",
    });
  }
};

module.exports = {
  trainerAuth,
};
