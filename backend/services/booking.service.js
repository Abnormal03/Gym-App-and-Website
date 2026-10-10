const prisma = require("../config/prisma");
const { allowedTransitions } = require("../config/bookingTransitions");
const { expireStale, getUsedCapacity } = require("./bookingHelpers.service");

const isAdmin = (role) => role === "gym_admin" || role === "platform_admin";

const validatePositiveId = (value, fieldName = "ID") => {
  const id = Number(value);

  if (!Number.isInteger(id) || id <= 0) {
    throw new Error(`Invalid ${fieldName}`);
  }

  return id;
};

const createBooking = async ({
  userId,
  gymId,
  packageId,
  slotStart,
  slotEnd,
  headcount = 1,
}) => {
  userId = validatePositiveId(userId, "user ID");
  gymId = validatePositiveId(gymId, "gym ID");

  if (packageId === undefined || packageId === null || packageId === "") {
    packageId = null;
  } else {
    packageId = validatePositiveId(packageId, "package ID");
  }

  headcount = Number(headcount);

  if (!Number.isInteger(headcount) || headcount <= 0) {
    throw new Error("Headcount must be a positive integer");
  }

  if (!slotStart || !slotEnd) {
    throw new Error("Invalid booking date");
  }

  const start = new Date(slotStart);
  const end = new Date(slotEnd);

  if (Number.isNaN(start.getTime()) || Number.isNaN(end.getTime())) {
    throw new Error("Invalid booking date");
  }

  if (start <= new Date()) {
    throw new Error("Booking start must be in the future");
  }

  if (start >= end) {
    throw new Error("slotStart must be before slotEnd");
  }

  return prisma.$transaction(
    async (tx) => {
      // Lock the gym row so concurrent bookings serialize capacity checks.
      const lockedGyms = await tx.$queryRaw`
        SELECT "id"
        FROM "Gym"
        WHERE "id" = ${gymId}
        FOR UPDATE
      `;

      if (lockedGyms.length === 0) {
        throw new Error("Gym not found");
      }

      const gym = await tx.gym.findUnique({
        where: { id: gymId },
      });

      if (!gym) {
        throw new Error("Gym not found");
      }

      if (gym.isActive === false) {
        throw new Error("Gym is not active");
      }

      // Expire old unpaid bookings before checking capacity.
      await expireStale(tx, { gymId });

      let selectedPackage = null;

      if (packageId !== null) {
        selectedPackage = await tx.package.findFirst({
          where: {
            id: packageId,
            gymId,
          },
        });

        if (!selectedPackage) {
          throw new Error("Package not found for this gym");
        }

        if (
          selectedPackage.isActive === false ||
          selectedPackage.active === false
        ) {
          throw new Error("Package is not active");
        }
      }

      const usedCapacity = await getUsedCapacity(tx, gymId, start, end);

      const capacity = Number(gym.capacity);

      if (
        !Number.isFinite(capacity) ||
        capacity <= 0 ||
        usedCapacity + headcount > capacity
      ) {
        throw new Error("Selected slot is fully booked");
      }

      return tx.booking.create({
        data: {
          userId,
          gymId,
          packageId,
          slotStart: start,
          slotEnd: end,
          headcount,
        },
        include: {
          gym: true,
          package: true,
          payment: true,
        },
      });
    },
    {
      maxWait: 10000,
      timeout: 30000,
    },
  );
};

const getMyBookings = async (userId) => {
  userId = validatePositiveId(userId, "user ID");

  return prisma.booking.findMany({
    where: { userId },
    include: {
      gym: true,
      package: true,
      payment: true,
    },
    orderBy: { createdAt: "desc" },
  });
};

const getBookingById = async (id, userId, role) => {
  id = validatePositiveId(id, "booking ID");
  userId = validatePositiveId(userId, "user ID");

  const booking = await prisma.booking.findUnique({
    where: { id },
    include: {
      gym: true,
      package: true,
      payment: true,
    },
  });

  if (!booking) {
    throw new Error("Booking not found");
  }

  if (booking.userId !== userId && !isAdmin(role)) {
    throw new Error("Access denied");
  }

  return booking;
};

const changeBookingStatus = async (id, newStatus) => {
  id = validatePositiveId(id, "booking ID");

  return prisma.$transaction(async (tx) => {
    const booking = await tx.booking.findUnique({
      where: { id },
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

    return tx.booking.update({
      where: { id },
      data: { status: newStatus },
      include: {
        gym: true,
        package: true,
        payment: true,
      },
    });
  });
};

const cancelBooking = async (id, userId, role) => {
  id = validatePositiveId(id, "booking ID");
  userId = validatePositiveId(userId, "user ID");

  const booking = await prisma.booking.findUnique({
    where: { id },
  });

  if (!booking) {
    throw new Error("Booking not found");
  }

  if (booking.userId !== userId && !isAdmin(role)) {
    throw new Error("Access denied");
  }

  return changeBookingStatus(id, "cancelled");
};

const confirmBooking = async (id, role) => {
  if (!isAdmin(role)) {
    throw new Error("Admin access required");
  }

  return changeBookingStatus(id, "confirmed");
};

const checkInBooking = async (id, role) => {
  if (!isAdmin(role)) {
    throw new Error("Admin access required");
  }

  return changeBookingStatus(id, "checked_in");
};

const getGymBookings = async (gymId) => {
  gymId = validatePositiveId(gymId, "gym ID");

  const gym = await prisma.gym.findUnique({
    where: { id: gymId },
  });

  if (!gym) {
    throw new Error("Gym not found");
  }

  return prisma.booking.findMany({
    where: { gymId },
    include: {
      user: true,
      package: true,
      payment: true,
    },
    orderBy: { createdAt: "desc" },
  });
};

const getBookingStats = async () => {
  const [
    total,
    pending,
    confirmed,
    checkedIn,
    cancelled,
    expired,
    paymentFailed,
  ] = await Promise.all([
    prisma.booking.count(),
    prisma.booking.count({ where: { status: "pending" } }),
    prisma.booking.count({ where: { status: "confirmed" } }),
    prisma.booking.count({ where: { status: "checked_in" } }),
    prisma.booking.count({ where: { status: "cancelled" } }),
    prisma.booking.count({ where: { status: "expired" } }),
    prisma.booking.count({ where: { status: "payment_failed" } }),
  ]);

  return {
    total,
    pending,
    confirmed,
    checkedIn,
    cancelled,
    expired,
    paymentFailed,
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
