const {
  getDashboardData,
  getAllUsers: getAllUsersService,
  getUserById: getUserByIdService,
  deleteUser: deleteUserService,
  getAdminProfile: getAdminProfileService,

  getPendingTrainers: getPendingTrainersService,
  getTrainerForVerification: getTrainerForVerificationService,
  verifyTrainer: verifyTrainerService,
  rejectTrainer: rejectTrainerService,

  getAdminGyms: getAdminGymsService,
  getAdminRevenue: getAdminRevenueService,
} = require("../services/admin.service");

const getDashboard = async (req, res) => {
  try {
    const data = await getDashboardData();

    return res.status(200).json({
      success: true,
      message: "Admin dashboard data",
      data,
    });
  } catch (error) {
    console.log("Dashboard Error:", error.message);

    return res.status(500).json({
      success: false,
      message: "Failed to load dashboard",
    });
  }
};

const getAllUsers = async (req, res) => {
  try {
    const adminId = req.user.id;

    const users = await getAllUsersService(adminId);

    return res.status(200).json({
      success: true,
      users,
    });
  } catch (error) {
    console.log("Get Users Error:", error.message);

    return res.status(500).json({
      success: false,
      message: "Failed to get users",
    });
  }
};

const getUserById = async (req, res) => {
  try {
    const userId = Number(req.params.id);

    if (!Number.isInteger(userId)) {
      return res.status(400).json({
        success: false,
        message: "Invalid user ID",
      });
    }

    const user = await getUserByIdService(userId);

    if (!user) {
      return res.status(404).json({
        success: false,
        message: "User not found",
      });
    }

    return res.status(200).json({
      success: true,
      user,
    });
  } catch (error) {
    console.log("User Error:", error.message);

    return res.status(500).json({
      success: false,
      message: "Failed to get user",
    });
  }
};

const deleteUser = async (req, res) => {
  try {
    const userId = Number(req.params.id);

    if (!Number.isInteger(userId)) {
      return res.status(400).json({
        success: false,
        message: "Invalid user ID",
      });
    }

    const user = await getUserByIdService(userId);

    if (!user) {
      return res.status(404).json({
        success: false,
        message: "User not found",
      });
    }

    await deleteUserService(userId);

    return res.status(200).json({
      success: true,
      message: "User deleted successfully",
    });
  } catch (error) {
    console.log("Delete User Error:", error.message);

    return res.status(500).json({
      success: false,
      message: "Failed to delete user",
    });
  }
};

const getAdminProfile = async (req, res) => {
  try {
    const adminId = Number(req.user.id);

    const admin = await getAdminProfileService(adminId);

    if (!admin) {
      return res.status(404).json({
        success: false,
        message: "Admin not found",
      });
    }

    return res.status(200).json({
      success: true,
      admin,
    });
  } catch (error) {
    console.log("Admin Profile Error:", error.message);

    return res.status(500).json({
      success: false,
      message: "Failed to get admin profile",
    });
  }
};

const getPendingTrainers = async (req, res) => {
  try {
    const trainers = await getPendingTrainersService();

    return res.status(200).json({
      success: true,
      trainers,
    });
  } catch (error) {
    console.log("Get Pending Trainers Error:", error.message);

    return res.status(500).json({
      success: false,
      message: "Failed to get pending trainers",
    });
  }
};

const getTrainerForVerification = async (req, res) => {
  try {
    const trainerId = Number(req.params.id);

    if (!Number.isInteger(trainerId)) {
      return res.status(400).json({
        success: false,
        message: "Invalid trainer ID",
      });
    }

    const trainer = await getTrainerForVerificationService(trainerId);

    if (!trainer) {
      return res.status(404).json({
        success: false,
        message: "Trainer not found",
      });
    }

    return res.status(200).json({
      success: true,
      trainer,
    });
  } catch (error) {
    console.log("Get Trainer Error:", error.message);

    return res.status(500).json({
      success: false,
      message: "Failed to get trainer",
    });
  }
};

const verifyTrainer = async (req, res) => {
  try {
    const trainerId = Number(req.params.id);

    if (!Number.isInteger(trainerId)) {
      return res.status(400).json({
        success: false,
        message: "Invalid trainer ID",
      });
    }

    const trainer = await getTrainerForVerificationService(trainerId);

    if (!trainer) {
      return res.status(404).json({
        success: false,
        message: "Trainer not found",
      });
    }

    const updatedTrainer = await verifyTrainerService(trainerId);

    return res.status(200).json({
      success: true,
      message: "Trainer verified successfully",
      trainer: updatedTrainer,
    });
  } catch (error) {
    console.log("Verify Trainer Error:", error.message);

    return res.status(500).json({
      success: false,
      message: "Failed to verify trainer",
    });
  }
};

const rejectTrainer = async (req, res) => {
  try {
    const trainerId = Number(req.params.id);

    if (!Number.isInteger(trainerId)) {
      return res.status(400).json({
        success: false,
        message: "Invalid trainer ID",
      });
    }

    const trainer = await getTrainerForVerificationService(trainerId);

    if (!trainer) {
      return res.status(404).json({
        success: false,
        message: "Trainer not found",
      });
    }

    const updatedTrainer = await rejectTrainerService(trainerId);

    return res.status(200).json({
      success: true,
      message: "Trainer rejected successfully",
      trainer: updatedTrainer,
    });
  } catch (error) {
    console.log("Reject Trainer Error:", error.message);

    return res.status(500).json({
      success: false,
      message: "Failed to reject trainer",
    });
  }
};

const getAdminGymsList = async (req, res) => {
  try {
    // Support both legacy protect middleware (req.user) and V2 authenticate (req.auth).
    const adminId = Number(req.auth?.adminId ?? req.auth?.id ?? req.user?.id);

    if (!Number.isInteger(adminId) || adminId <= 0) {
      return res
        .status(400)
        .json({ success: false, message: "Invalid admin ID" });
    }

    const gyms = await getAdminGymsService(adminId);

    return res.status(200).json({ success: true, count: gyms.length, gyms });
  } catch (error) {
    console.error("Get admin gyms error:", error.message);
    return res
      .status(500)
      .json({ success: false, message: "Failed to get gyms" });
  }
};

const getAdminRevenueController = async (req, res) => {
  try {
    const adminId = Number(req.auth?.adminId ?? req.auth?.id ?? req.user?.id);

    if (!Number.isInteger(adminId) || adminId <= 0) {
      return res
        .status(400)
        .json({ success: false, message: "Invalid admin ID" });
    }

    const { gymId, from, to } = req.query;

    const data = await getAdminRevenueService({ adminId, gymId, from, to });

    return res.status(200).json({ success: true, ...data });
  } catch (error) {
    console.error("Admin revenue error:", error.message);

    if (
      error.message === "Invalid gymId" ||
      error.message === "Invalid from date" ||
      error.message === "Invalid to date"
    ) {
      return res.status(400).json({ success: false, message: error.message });
    }

    if (error.message === "Gym not found or not owned by you") {
      return res.status(403).json({ success: false, message: error.message });
    }

    return res
      .status(500)
      .json({ success: false, message: "Failed to get revenue" });
  }
};

module.exports = {
  getDashboard,

  getAllUsers,
  getUserById,
  deleteUser,

  getAdminProfile,

  getPendingTrainers,
  getTrainerForVerification,
  verifyTrainer,
  rejectTrainer,

  getAdminGymsList,
  getAdminRevenueController,
};
