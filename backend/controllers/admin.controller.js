const prisma = require("../config/prisma");

const getDashboard = async (req, res) => {
  try {
    const totalUsers = await prisma.user.count();

    const totalAdmins = await prisma.gymAdmin.count();

    const totalGyms = await prisma.gym.count({
      where: {
        isActive: true,
      },
    });

    const totalBookings = await prisma.booking.count();

    const totalPayments = await prisma.payment.count();

    res.status(200).json({
      success: true,
      message: "Admin dashboard data",
      data: {
        totalUsers,
        totalAdmins,
        totalGyms,
        totalBookings,
        totalPayments,
      },
    });
  } catch (error) {
    console.log("Dashboard Error:", error.message);

    res.status(500).json({
      success: false,
      message: "Failed to load dashboard",
    });
  }
};

const getAllUsers = async (req, res) => {
  try {
    const users = await prisma.user.findMany({
      select: {
        id: true,
        name: true,
        email: true,
        phone: true,
        createdAt: true,
      },

      orderBy: {
        createdAt: "desc",
      },
    });

    res.status(200).json({
      success: true,
      users,
    });
  } catch (error) {
    console.log("Get Users Error:", error.message);

    res.status(500).json({
      success: false,
      message: "Failed to get users",
    });
  }
};

const getUserById = async (req, res) => {
  try {
    const { id } = req.params;

    const userId = Number(id);

    if (!Number.isInteger(userId)) {
      return res.status(400).json({
        success: false,
        message: "Invalid user ID",
      });
    }

    const user = await prisma.user.findUnique({
      where: {
        id: userId,
      },

      select: {
        id: true,
        name: true,
        email: true,
        phone: true,
        createdAt: true,
      },
    });

    if (!user) {
      return res.status(404).json({
        success: false,
        message: "User not found",
      });
    }

    res.status(200).json({
      success: true,
      user,
    });
  } catch (error) {
    console.log("User Error:", error.message);

    res.status(500).json({
      success: false,
      message: "Failed to get user",
    });
  }
};

const deleteUser = async (req, res) => {
  try {
    const { id } = req.params;

    const userId = Number(id);

    // Validate ID
    if (!Number.isInteger(userId)) {
      return res.status(400).json({
        success: false,
        message: "Invalid user ID",
      });
    }

    // Check if user exists
    const user = await prisma.user.findUnique({
      where: {
        id: userId,
      },
    });

    if (!user) {
      return res.status(404).json({
        success: false,
        message: "User not found",
      });
    }

    // Delete user
    await prisma.user.delete({
      where: {
        id: userId,
      },
    });

    res.status(200).json({
      success: true,
      message: "User deleted successfully",
    });
  } catch (error) {
    console.log("Delete User Error:", error.message);

    res.status(500).json({
      success: false,
      message: "Failed to delete user",
    });
  }
};

const getAdminProfile = async (req, res) => {
  try {
    const adminId = Number(req.user.id);

    const admin = await prisma.gymAdmin.findUnique({
      where: {
        id: adminId,
      },

      select: {
        id: true,
        name: true,
        email: true,
        createdAt: true,
      },
    });

    if (!admin) {
      return res.status(404).json({
        success: false,
        message: "Admin not found",
      });
    }

    res.status(200).json({
      success: true,
      admin,
    });
  } catch (error) {
    console.log("Admin Profile Error:", error.message);

    res.status(500).json({
      success: false,
      message: "Failed to get admin profile",
    });
  }
};

module.exports = {
  getDashboard,
  getAllUsers,
  getUserById,
  deleteUser,
  getAdminProfile,
};
