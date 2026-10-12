const prisma = require("../config/prisma");

const parseId = (value) => {
  if (
    value === undefined ||
    value === null ||
    value === "" ||
    !Number.isSafeInteger(Number(value)) ||
    Number(value) <= 0
  ) {
    return null;
  }

  return Number(value);
};

const verifyGymOwner = async (req, res, next) => {
  try {
    const userId = parseId(req.user?.id);
    const gymId = parseId(req.body?.gymId);

    if (!userId) {
      return res.status(401).json({
        success: false,
        message: "Authentication required",
      });
    }

    if (!gymId) {
      return res.status(400).json({
        success: false,
        message: "A valid gymId is required",
      });
    }

    const gym = await prisma.gym.findUnique({
      where: { id: gymId },
      select: {
        id: true,
        adminId: true,
        isActive: true,
      },
    });

    if (!gym) {
      return res.status(404).json({
        success: false,
        message: "Gym not found",
      });
    }

    if (Number(gym.adminId) !== userId) {
      return res.status(403).json({
        success: false,
        message: "You are not the owner of this gym",
      });
    }

    if (!gym.isActive) {
      return res.status(409).json({
        success: false,
        message: "Gym is not active",
      });
    }

    return next();
  } catch (error) {
    console.error("verifyGymOwner error:", error);

    return res.status(500).json({
      success: false,
      message: "Failed to verify gym ownership",
    });
  }
};

const verifyPackageOwner = async (req, res, next) => {
  try {
    const userId = parseId(req.user?.id);
    const packageId = parseId(req.params?.id);

    if (!userId) {
      return res.status(401).json({
        success: false,
        message: "Authentication required",
      });
    }

    if (!packageId) {
      return res.status(400).json({
        success: false,
        message: "Invalid package ID",
      });
    }

    const pkg = await prisma.package.findUnique({
      where: { id: packageId },
      select: {
        id: true,
        isActive: true,
        gym: {
          select: {
            adminId: true,
          },
        },
      },
    });

    if (!pkg) {
      return res.status(404).json({
        success: false,
        message: "Package not found",
      });
    }

    if (Number(pkg.gym.adminId) !== userId) {
      return res.status(403).json({
        success: false,
        message: "You are not the owner of this package's gym",
      });
    }

    if (!pkg.isActive) {
      return res.status(409).json({
        success: false,
        message: "Package is already inactive",
      });
    }

    return next();
  } catch (error) {
    console.error("verifyPackageOwner error:", error);

    return res.status(500).json({
      success: false,
      message: "Failed to verify package ownership",
    });
  }
};

module.exports = {
  verifyGymOwner,
  verifyPackageOwner,
};
