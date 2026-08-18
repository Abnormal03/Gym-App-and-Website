const prisma = require("../config/prisma");

// Get admin dashboard information
const getDashboard = async (req, res) => {
  try {
    const totalUsers = await prisma.user.count();

    const totalAdmins = await prisma.gymAdmin.count();

    res.status(200).json({
      success: true,
      message: "Admin dashboard data",
      data: {
        totalUsers,
        totalAdmins,
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

// Get all users
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

// Get single user by ID
const getUserById = async (req, res) => {
  try {
    const { id } = req.params;

    const user = await prisma.user.findUnique({
      where: {
        id: Number(id),
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

// Delete user
const deleteUser = async (req, res) => {
  try {
    const { id } = req.params;

    const user = await prisma.user.findUnique({
      where: {
        id: Number(id),
      },
    });

    if (!user) {
      return res.status(404).json({
        success: false,
        message: "User not found",
      });
    }

    await prisma.user.delete({
      where: {
        id: Number(id),
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

// Get logged-in admin profile
const getAdminProfile = async (req, res) => {
  try {
    const admin = await prisma.gymAdmin.findUnique({
      where: {
        id: req.user.id,
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
