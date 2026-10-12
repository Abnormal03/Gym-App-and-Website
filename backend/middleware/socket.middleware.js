const jwt = require("jsonwebtoken");

const socketAuth = (socket, next) => {
  try {
    const token = socket.handshake.auth?.token;

    if (!token) {
      return next(new Error("Authentication required"));
    }

    const decoded = jwt.verify(token, process.env.JWT_SECRET);

    // Trainer
    if (decoded.role === "trainer" && decoded.trainerId) {
      socket.user = {
        type: "TRAINER",
        id: decoded.trainerId,
      };

      return next();
    }

    // Member
    if (decoded.userId) {
      socket.user = {
        type: "MEMBER",
        id: decoded.userId,
      };

      return next();
    }

    return next(new Error("Invalid authentication payload"));
  } catch (error) {
    console.error("Socket authentication error:", error);

    return next(new Error("Invalid or expired token"));
  }
};

module.exports = {
  socketAuth,
};
