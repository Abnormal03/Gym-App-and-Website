const prisma = require("../config/prisma");

// Verify logged-in user owns the gym
const verifyGymOwner = async (req, res, next) => {
  try {
    const { id } = req.user;
    const gymId = req.body?.gymId || req.params?.gymId;

    if (!gymId) {
      return res.status(400).json({
        success: false,
        message: "gymId is required",
      });
    }
    const gym = await prisma.gym.findFirst({
      where: {
        id: Number(gymId),
        adminId: Number(id),
      },
    });

    if (!gym) {
      return res.status(403).json({
        success: false,
        message: "You are not the owner of this gym",
      });
    }

    next();
  } catch (error) {
    console.log("Verify Gym Owner Error:", error.message);

    return res.status(500).json({
      success: false,
      message: "Gym owner verification failed",
    });
  }
};

module.exports = {
  verifyGymOwner,
};
