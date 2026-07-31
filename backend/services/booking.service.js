const prisma = require("../config/prisma");

const allowedTransitions = {
  pending: ["confirmed", "cancelled"],
  confirmed: ["checked_in", "cancelled"],
  checked_in: [],
  cancelled: [],
};
const isAdmin = (role) => role === "gym_admin" || role === "platform_admin";
// CREATE BOOKING
// CREATE BOOKING
const createBooking = async ({
  userId,
  gymId,
  packageId,
  slotStart,
  slotEnd,
}) => {
  userId = Number(userId);
  gymId = Number(gymId);

  if (packageId) {
    packageId = Number(packageId);
  }

  const start = new Date(slotStart);
  const end = new Date(slotEnd);

  if (isNaN(start.getTime()) || isNaN(end.getTime())) {
    throw new Error("Invalid booking date");
  }

  if (start >= end) {
    throw new Error("slotStart must be before slotEnd");
  }

  return await prisma.$transaction(
    async (tx) => {
      // Check gym exists
      const gym = await tx.gym.findUnique({
        where: {
          id: gymId,
        },
      });

      if (!gym) {
        throw new Error("Gym not found");
      }

      // Check package belongs to gym
      if (packageId) {
        const pkg = await tx.package.findFirst({
          where: {
            id: packageId,
            gymId: gymId,
          },
        });

        if (!pkg) {
          throw new Error("Package not found for this gym");
        }
      }

      // Check overlapping bookings
      const bookedCount = await tx.booking.count({
        where: {
          gymId,

          slotStart: {
            lt: end,
          },

          slotEnd: {
            gt: start,
          },

          status: {
            not: "cancelled",
          },
        },
      });

      const capacity = gym.capacity || 1;

      if (bookedCount >= capacity) {
        throw new Error("Selected slot is fully booked");
      }

      // Create booking
      const booking = await tx.booking.create({
        data: {
          userId,
          gymId,
          packageId: packageId || null,
          slotStart: start,
          slotEnd: end,
        },

        include: {
          gym: true,
          package: true,
        },
      });

      return booking;
    },
    {
      maxWait: 10000,
      timeout: 30000,
    },
  );
};

// GET USER BOOKINGS
const getMyBookings = async (userId) => {
  return await prisma.booking.findMany({
    where: {
      userId,
    },

    include: {
      gym: true,
      package: true,
      payment: true,
    },

    orderBy: {
      createdAt: "desc",
    },
  });
};
// GET BOOKING BY ID
// GET BOOKING BY ID
const getBookingById = async (id, userId, role) => {
  const booking = await prisma.booking.findUnique({
    where: {
      id,
    },

    include: {
      gym: true,
      package: true,
      payment: true,
    },
  });

  if (!booking) {
    throw new Error("Booking not found");
  }

  // Owner or admin can view booking
  if (booking.userId !== userId && !isAdmin(role)) {
    throw new Error("Access denied");
  }

  return booking;
};

// STATUS CHANGE
const changeBookingStatus = async (id, newStatus) => {
  const booking = await prisma.booking.findUnique({
    where: {
      id,
    },
  });

  if (!booking) {
    throw new Error("Booking not found");
  }

  const allowed = allowedTransitions[booking.status];

  if (!allowed) {
    throw new Error(`Unknown current status: ${booking.status}`);
  }

  if (!allowed.includes(newStatus)) {
    throw new Error(
      `Cannot change booking from ${booking.status} to ${newStatus}`,
    );
  }

  return await prisma.booking.update({
    where: {
      id,
    },

    data: {
      status: newStatus,
    },
  });
};
// CANCEL BOOKING
const cancelBooking = async (id, userId, role) => {
  const booking = await prisma.booking.findUnique({
    where: {
      id,
    },
  });

  if (!booking) {
    throw new Error("Booking not found");
  }

  // User can cancel own booking, admin can cancel any booking
  if (booking.userId !== userId && !isAdmin(role)) {
    throw new Error("Access denied");
  }

  return changeBookingStatus(id, "cancelled");
};

// CONFIRM BOOKING
const confirmBooking = async (id, role) => {
  if (!isAdmin(role)) {
    throw new Error("Admin access required");
  }

  return changeBookingStatus(id, "confirmed");
};

// CHECK IN BOOKING
const checkInBooking = async (id, role) => {
  if (!isAdmin(role)) {
    throw new Error("Admin access required");
  }

  return changeBookingStatus(id, "checked_in");
};

// GET GYM BOOKINGS

const getGymBookings = async (gymId) => {
  const gym = await prisma.gym.findUnique({
    where: {
      id: gymId,
    },
  });

  if (!gym) {
    throw new Error("Gym not found");
  }

  return await prisma.booking.findMany({
    where: {
      gymId,
    },

    include: {
      user: true,
      package: true,
      payment: true,
    },

    orderBy: {
      createdAt: "desc",
    },
  });
};

// STATISTICS

const getBookingStats = async () => {
  const totalBookings = await prisma.booking.count();

  const pendingBookings = await prisma.booking.count({
    where: {
      status: "pending",
    },
  });

  const confirmedBookings = await prisma.booking.count({
    where: {
      status: "confirmed",
    },
  });

  const cancelledBookings = await prisma.booking.count({
    where: {
      status: "cancelled",
    },
  });

  const checkedInBookings = await prisma.booking.count({
    where: {
      status: "checked_in",
    },
  });

  return {
    totalBookings,
    pendingBookings,
    confirmedBookings,
    cancelledBookings,
    checkedInBookings,
  };
};

module.exports = {
  createBooking,
  getMyBookings,
  getBookingById,
  cancelBooking,
  confirmBooking,
  checkInBooking,
  getGymBookings,
  getBookingStats,
};
