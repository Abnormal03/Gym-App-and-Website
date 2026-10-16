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

const getAllUsers = async (adminId) => {
  const now = new Date();

  return prisma.user.findMany({
    where: {
      memberPackages: {
        some: {
          status: "ACTIVE",
          startsAt: {
            lte: now,
          },
          endsAt: {
            gt: now,
          },
          gym: {
            adminId: adminId,
          },
        },
      },
    },
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

const getAdminGyms = async (adminId) => {
  return prisma.gym.findMany({
    where: { adminId },
    select: {
      id: true,
      name: true,
      address: true,
      latitude: true,
      longitude: true,
      openingTime: true,
      closingTime: true,
      capacity: true,
      photos: true,
      amenities: true,
      isActive: true,
      createdAt: true,
    },
    orderBy: { name: "asc" },
  });
};

const getAdminRevenue = async ({ adminId, gymId, from, to }) => {
  // Build gym filter — admin must own every gym in the filter.
  const ownedGyms = await prisma.gym.findMany({
    where: { adminId },
    select: { id: true },
  });
  const ownedIds = ownedGyms.map((g) => g.id);

  let gymIds;
  if (gymId !== undefined && gymId !== null && gymId !== "") {
    const id = Number(gymId);
    if (!Number.isInteger(id) || id <= 0) throw new Error("Invalid gymId");
    if (!ownedIds.includes(id))
      throw new Error("Gym not found or not owned by you");
    gymIds = [id];
  } else {
    gymIds = ownedIds;
  }

  const where = {
    status: "success",
    booking: {
      gymId: { in: gymIds },
    },
  };

  if (from) {
    const fromDate = new Date(`${from}T00:00:00.000Z`);

    if (Number.isNaN(fromDate.getTime())) {
      throw new Error("Invalid from date");
    }

    where.createdAt = {
      ...where.createdAt,
      gte: fromDate,
    };
  }

  if (to) {
    const toDate = new Date(`${to}T00:00:00.000Z`);

    if (Number.isNaN(toDate.getTime())) {
      throw new Error("Invalid to date");
    }

    // Include the entire selected day by using the next day
    // as an exclusive upper boundary.
    toDate.setUTCDate(toDate.getUTCDate() + 1);

    where.createdAt = {
      ...where.createdAt,
      lt: toDate,
    };
  }

  const payments = await prisma.payment.findMany({
    where,
    select: {
      id: true,
      amount: true,
      currency: true,
      chapaTxRef: true,
      createdAt: true,
      booking: {
        select: {
          id: true,
          gymId: true,
          gym: { select: { id: true, name: true } },
          user: { select: { id: true, name: true } },
        },
      },
    },
    orderBy: { createdAt: "desc" },
  });

  const totalAmount = payments.reduce((sum, p) => sum + Number(p.amount), 0);

  // Group by calendar date (UTC date string)
  const byDay = {};
  for (const p of payments) {
    const day = p.createdAt.toISOString().slice(0, 10);
    byDay[day] = (byDay[day] || 0) + Number(p.amount);
  }
  const perDay = Object.entries(byDay)
    .map(([date, amount]) => ({ date, amount }))
    .sort((a, b) => a.date.localeCompare(b.date));

  return {
    total: totalAmount,
    currency: payments[0]?.booking?.gym ? "ETB" : "ETB",
    count: payments.length,
    perDay,
    payments: payments.map((p) => ({
      id: p.id,
      amount: Number(p.amount),
      currency: p.currency ?? "ETB",
      chapaTxRef: p.chapaTxRef,
      createdAt: p.createdAt,
      bookingId: p.booking?.id ?? null,
      gymId: p.booking?.gymId ?? null,
      gymName: p.booking?.gym?.name ?? null,
      memberName: p.booking?.user?.name ?? null,
    })),
  };
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

  getAdminGyms,
  getAdminRevenue,
};
