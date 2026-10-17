const prisma = require("../config/prisma");
const { AppError } = require("../utils/errors");
const { parseUtcSlotRange, isWithinGymOpeningHours } = require("../utils/time");
const { getUsedCapacity, expireStale } = require("./bookingHelpers.service");

const validatePositiveId = (value, fieldName = "ID") => {
  const id = Number(value);

  if (!Number.isSafeInteger(id) || id <= 0) {
    throw new Error(`Invalid ${fieldName}`);
  }

  return id;
};

const validateCapacity = (capacity) => {
  const value = Number(capacity);

  if (!Number.isSafeInteger(value) || value <= 0) {
    throw new Error("Capacity must be a positive integer");
  }

  return value;
};

const validateSlotRange = (slotStart, slotEnd) => {
  return parseUtcSlotRange(slotStart, slotEnd);
};

const getGymsService = async () => {
  return prisma.gym.findMany({
    where: {
      isActive: true,
    },
    select: {
      id: true,
      name: true,
      address: true,
      openingTime: true,
      closingTime: true,
      capacity: true,
      photos: true,
      amenities: true,
    },
    orderBy: {
      name: "asc",
    },
  });
};

const gymDetails = async (id) => {
  const gymId = validatePositiveId(id, "gym ID");

  const gym = await prisma.gym.findFirst({
    where: {
      id: gymId,
      isActive: true,
    },
    include: {
      packages: {
        where: {
          isActive: true,
        },
      },
      _count: {
        select: {
          bookings: {
            where: {
              slotStart: {
                gt: new Date(),
              },
              status: {
                in: ["pending", "confirmed", "checked_in"],
              },
            },
          },
        },
      },
    },
  });

  if (!gym) {
    throw new Error("Gym not found");
  }

  return gym;
};

const createGym = async ({
  name,
  address,
  latitude,
  longitude,
  openingTime,
  closingTime,
  capacity,
  photos,
  amenities,
  adminId,
}) => {
  if (typeof name !== "string" || !name.trim()) {
    throw new Error("Gym name is required");
  }

  if (typeof address !== "string" || !address.trim()) {
    throw new Error("Gym address is required");
  }

  const ownerId = validatePositiveId(adminId, "admin ID");
  const validCapacity = validateCapacity(capacity);

  const lat = Number(latitude);
  const lng = Number(longitude);

  if (
    latitude === undefined ||
    latitude === null ||
    latitude === "" ||
    !Number.isFinite(lat) ||
    lat < -90 ||
    lat > 90
  ) {
    throw new Error("Invalid latitude");
  }

  if (
    longitude === undefined ||
    longitude === null ||
    longitude === "" ||
    !Number.isFinite(lng) ||
    lng < -180 ||
    lng > 180
  ) {
    throw new Error("Invalid longitude");
  }

  if (
    typeof openingTime !== "string" ||
    !openingTime.trim() ||
    typeof closingTime !== "string" ||
    !closingTime.trim()
  ) {
    throw new Error("Opening time and closing time are required");
  }

  if (photos !== undefined && !Array.isArray(photos)) {
    throw new Error("Photos must be an array");
  }

  if (amenities !== undefined && !Array.isArray(amenities)) {
    throw new Error("Amenities must be an array");
  }

  return prisma.gym.create({
    data: {
      name: name.trim(),
      address: address.trim(),
      latitude: lat,
      longitude: lng,
      openingTime: openingTime.trim(),
      closingTime: closingTime.trim(),
      capacity: validCapacity,
      photos: photos || [],
      amenities: amenities || [],
      adminId: ownerId,
    },
  });
};

const checkOwnership = async (userId, gymId) => {
  const ownerId = validatePositiveId(userId, "user ID");
  const id = validatePositiveId(gymId, "gym ID");

  const gym = await prisma.gym.findFirst({
    where: {
      id,
      adminId: ownerId,
    },
    select: {
      id: true,
    },
  });

  return Boolean(gym);
};

const UpdateDetails = async (input) => {
  const {
    id,
    adminId,
    name,
    address,
    latitude,
    longitude,
    openingTime,
    closingTime,
    capacity,
    photos,
    amenities,
    isActive,
  } = input;

  const gymId = validatePositiveId(id, "gym ID");
  const ownerId = validatePositiveId(adminId, "admin ID");

  const allowedFields = [
    "name",
    "address",
    "latitude",
    "longitude",
    "openingTime",
    "closingTime",
    "capacity",
    "photos",
    "amenities",
  ];

  const suppliedFields = Object.keys(input || {});
  const unsupportedFields = suppliedFields.filter(
    (field) => !["id", "adminId", ...allowedFields].includes(field),
  );

  if (unsupportedFields.length > 0) {
    throw new Error(`Unsupported gym fields: ${unsupportedFields.join(", ")}`);
  }

  const updateData = {};

  if (name !== undefined) {
    if (typeof name !== "string" || !name.trim()) {
      throw new Error("Gym name cannot be empty");
    }
    updateData.name = name.trim();
  }

  if (address !== undefined) {
    if (typeof address !== "string" || !address.trim()) {
      throw new Error("Gym address cannot be empty");
    }
    updateData.address = address.trim();
  }

  if (latitude !== undefined) {
    if (
      latitude === null ||
      latitude === "" ||
      !Number.isFinite(Number(latitude)) ||
      Number(latitude) < -90 ||
      Number(latitude) > 90
    ) {
      throw new Error("Invalid latitude");
    }
    updateData.latitude = Number(latitude);
  }

  if (longitude !== undefined) {
    if (
      longitude === null ||
      longitude === "" ||
      !Number.isFinite(Number(longitude)) ||
      Number(longitude) < -180 ||
      Number(longitude) > 180
    ) {
      throw new Error("Invalid longitude");
    }
    updateData.longitude = Number(longitude);
  }

  if (openingTime !== undefined) {
    if (
      typeof openingTime !== "string" ||
      !/^(?:[01]\d|2[0-3]):[0-5]\d$/.test(openingTime)
    ) {
      throw new Error("Invalid opening time");
    }
    updateData.openingTime = openingTime;
  }

  if (closingTime !== undefined) {
    if (
      typeof closingTime !== "string" ||
      !/^(?:[01]\d|2[0-3]):[0-5]\d$/.test(closingTime)
    ) {
      throw new Error("Invalid closing time");
    }
    updateData.closingTime = closingTime;
  }

  if (capacity !== undefined) {
    updateData.capacity = validateCapacity(capacity);
  }

  if (photos !== undefined) {
    if (
      !Array.isArray(photos) ||
      !photos.every((photo) => typeof photo === "string")
    ) {
      throw new Error("Photos must be an array");
    }
    updateData.photos = photos;
  }

  if (amenities !== undefined) {
    if (
      !Array.isArray(amenities) ||
      !amenities.every((amenity) => typeof amenity === "string")
    ) {
      throw new Error("Amenities must be an array");
    }
    updateData.amenities = amenities;
  }

  if (Object.keys(updateData).length === 0) {
    throw new Error("No gym details provided to update");
  }

  const result = await prisma.gym.updateMany({
    where: {
      id: gymId,
      adminId: ownerId,
    },
    data: updateData,
  });

  if (result.count === 0) {
    const gym = await prisma.gym.findUnique({
      where: { id: gymId },
      select: { id: true },
    });

    if (!gym) {
      throw new Error("Gym not found");
    }

    throw new Error("You are not the owner of this gym");
  }

  return prisma.gym.findUnique({
    where: { id: gymId },
  });
};

const isAvailable = async (id, slot_start, slot_end) => {
  const gymId = validatePositiveId(id, "gym ID");
  const { start, end } = validateSlotRange(slot_start, slot_end);

  if (start <= new Date()) {
    throw new Error("Booking start must be in the future");
  }

  return prisma.$transaction(async (tx) => {
    // Serialize capacity checks for this gym.
    // Booking creation must use the same gym-row lock.
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
      where: {
        id: gymId,
      },
      select: {
        id: true,
        capacity: true,
        isActive: true,
        openingTime: true,
        closingTime: true,
      },
    });

    if (!gym) {
      throw new Error("Gym not found");
    }

    if (!gym.isActive) {
      throw new Error("Gym is not active");
    }

    await expireStale(tx, { gymId });

    const capacity = Number(gym.capacity);

    if (!Number.isFinite(capacity) || capacity <= 0) {
      throw new Error("Invalid gym capacity");
    }

    const booked = await getUsedCapacity(tx, gymId, start, end);
    const withinOpeningHours = isWithinGymOpeningHours(
      start,
      end,
      gym.openingTime,
      gym.closingTime,
    );

    return {
      capacity,
      booked,
      available: withinOpeningHours ? Math.max(0, capacity - booked) : 0,
      withinOpeningHours,
    };
  });
};

const searchGymsService = async (name, location) => {
  const where = {
    isActive: true,
  };

  if (name) {
    where.name = {
      contains: name.trim(),
      mode: "insensitive",
    };
  }

  if (location) {
    where.address = {
      contains: location.trim(),
      mode: "insensitive",
    };
  }

  return prisma.gym.findMany({
    where,
    select: {
      id: true,
      name: true,
      address: true,
      openingTime: true,
      closingTime: true,
      capacity: true,
      photos: true,
      amenities: true,
    },
    orderBy: {
      name: "asc",
    },
  });
};

const getGymStreakLeaderboardService = async (gymId, callerUserId) => {
  const gymIdNumber = validatePositiveId(gymId, "gym ID");
  const userId = Number(callerUserId);

  if (!Number.isSafeInteger(userId) || userId <= 0) {
    throw new AppError("VALIDATION", "Invalid user ID");
  }

  const gym = await prisma.gym.findUnique({
    where: { id: gymIdNumber },
    select: { id: true, name: true, isActive: true },
  });

  if (!gym || !gym.isActive) {
    throw new AppError("NOT_FOUND", "Gym not found");
  }

  if (process.env.FEATURE_STREAK_LEADERBOARD !== "true") {
    throw new AppError("NOT_FOUND", "Leaderboard not available");
  }

  const checkedInUsers = await prisma.checkIn.groupBy({
    by: ["userId"],
    where: { gymId: gymIdNumber },
  });

  const memberIds = checkedInUsers.map((row) => row.userId);

  if (memberIds.length === 0) {
    return {
      gymId: gym.id,
      gymName: gym.name,
      leaderboard: [],
      caller: null,
    };
  }

  const stats = await prisma.memberStats.findMany({
    where: {
      userId: { in: memberIds },
    },
    include: {
      user: {
        select: {
          id: true,
          name: true,
          photoUrl: true,
        },
      },
    },
  });

  const rows = stats
    .filter((stat) => stat.user)
    .map((stat) => ({
      userId: stat.userId,
      name: stat.user.name,
      photoUrl: stat.user.photoUrl,
      currentStreak: Number(stat.currentStreak || 0),
      totalWorkouts: Number(stat.totalWorkouts || 0),
      longestStreak: Number(stat.longestStreak || 0),
      lastWorkoutLocalDate: stat.lastWorkoutLocalDate,
    }))
    .sort((a, b) => {
      if (b.currentStreak !== a.currentStreak)
        return b.currentStreak - a.currentStreak;
      if (b.totalWorkouts !== a.totalWorkouts)
        return b.totalWorkouts - a.totalWorkouts;
      const nameOrder = (a.name || "").localeCompare(b.name || "");
      if (nameOrder !== 0) return nameOrder;
      return a.userId - b.userId;
    });

  const leaderboard = rows
    .map((row, index) => ({
      rank: index + 1,
      ...row,
    }))
    .slice(0, 20);

  const callerRank = rows.findIndex((row) => row.userId === userId);

  return {
    gymId: gym.id,
    gymName: gym.name,
    leaderboard,
    caller:
      callerRank >= 0
        ? {
            userId,
            rank: callerRank + 1,
            currentStreak: rows[callerRank].currentStreak,
            totalWorkouts: rows[callerRank].totalWorkouts,
            name: rows[callerRank].name,
            photoUrl: rows[callerRank].photoUrl,
          }
        : null,
  };
};

module.exports = {
  getGymsService,
  gymDetails,
  createGym,
  UpdateDetails,
  checkOwnership,
  isAvailable,
  searchGymsService,
  getGymStreakLeaderboardService,
};
