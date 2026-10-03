const prisma = require("../config/prisma");

const getDashboardData = async () => {
  const totalUsers = await prisma.user.count();

  const totalAdmins = await prisma.gymAdmin.count();

  const totalGyms = await prisma.gym.count({
    where: {
      isActive: true,
    },
  });

  const totalBookings = await prisma.booking.count();

  const totalPayments = await prisma.payment.count();

  return {
    totalUsers,
    totalAdmins,
    totalGyms,
    totalBookings,
    totalPayments,
  };
};

const getAllUsers = async () => {
  return prisma.user.findMany({
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
};

const getUserById = async (userId) => {
  return prisma.user.findUnique({
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
};

const deleteUser = async (userId) => {
  return prisma.user.delete({
    where: {
      id: userId,
    },
  });
};

const getAdminProfile = async (adminId) => {
  return prisma.gymAdmin.findUnique({
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
};

const getPendingTrainers = async () => {
  return prisma.trainer.findMany({
    where: {
      verificationStatus: "PENDING",
    },

    select: {
      id: true,
      name: true,
      email: true,
      bio: true,
      specialization: true,
      experienceYears: true,
      profilePhotoUrl: true,
      sessionPrice: true,
      verificationStatus: true,
      rating: true,
      createdAt: true,

      gym: {
        select: {
          id: true,
          name: true,
          address: true,
        },
      },

      credentials: {
        select: {
          id: true,
          fileUrl: true,
          label: true,
          uploadedAt: true,
        },

        orderBy: {
          uploadedAt: "desc",
        },
      },
    },

    orderBy: {
      createdAt: "asc",
    },
  });
};

const getTrainerForVerification = async (trainerId) => {
  return prisma.trainer.findUnique({
    where: {
      id: trainerId,
    },

    select: {
      id: true,
      name: true,
      email: true,
      bio: true,
      specialization: true,
      experienceYears: true,
      profilePhotoUrl: true,
      sessionPrice: true,
      verificationStatus: true,
      rating: true,
      createdAt: true,

      gym: {
        select: {
          id: true,
          name: true,
          address: true,
        },
      },

      credentials: {
        select: {
          id: true,
          fileUrl: true,
          label: true,
          uploadedAt: true,
        },

        orderBy: {
          uploadedAt: "desc",
        },
      },
    },
  });
};

const verifyTrainer = async (trainerId) => {
  return prisma.trainer.update({
    where: {
      id: trainerId,
    },

    data: {
      verificationStatus: "VERIFIED",
    },

    select: {
      id: true,
      name: true,
      email: true,
      verificationStatus: true,
    },
  });
};

const rejectTrainer = async (trainerId) => {
  return prisma.trainer.update({
    where: {
      id: trainerId,
    },

    data: {
      verificationStatus: "REJECTED",
    },

    select: {
      id: true,
      name: true,
      email: true,
      verificationStatus: true,
    },
  });
};

module.exports = {
  getDashboardData,

  getAllUsers,
  getUserById,
  deleteUser,

  getAdminProfile,

  getPendingTrainers,
  getTrainerForVerification,
  verifyTrainer,
  rejectTrainer,
};
