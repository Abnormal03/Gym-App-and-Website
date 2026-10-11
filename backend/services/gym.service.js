const prisma = require("../config/prisma");
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
  if (!slotStart || !slotEnd) {
    throw new Error("Slot start and end are required");
  }

  const start = new Date(slotStart);
  const end = new Date(slotEnd);

  if (!Number.isFinite(start.getTime()) || !Number.isFinite(end.getTime())) {
    throw new Error("Invalid slot range");
  }

  if (start >= end) {
    throw new Error("Invalid slot range");
  }

  return { start, end };
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

const UpdateDetails = async ({
  id,
  name,
  address,
  latitude,
  longitude,
  openingTime,
  closingTime,
  capacity,
  photos,
  amenities,
}) => {
  const gymId = validatePositiveId(id, "gym ID");
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
    if (typeof openingTime !== "string" || !openingTime.trim()) {
      throw new Error("Invalid opening time");
    }

    updateData.openingTime = openingTime.trim();
  }

  if (closingTime !== undefined) {
    if (typeof closingTime !== "string" || !closingTime.trim()) {
      throw new Error("Invalid closing time");
    }

    updateData.closingTime = closingTime.trim();
  }

  if (capacity !== undefined) {
    updateData.capacity = validateCapacity(capacity);
  }

  if (photos !== undefined) {
    if (!Array.isArray(photos)) {
      throw new Error("Photos must be an array");
    }

    updateData.photos = photos;
  }

  if (amenities !== undefined) {
    if (!Array.isArray(amenities)) {
      throw new Error("Amenities must be an array");
    }

    updateData.amenities = amenities;
  }

  if (Object.keys(updateData).length === 0) {
    throw new Error("No gym details provided to update");
  }

  const existingGym = await prisma.gym.findUnique({
    where: {
      id: gymId,
    },
    select: {
      id: true,
    },
  });

  if (!existingGym) {
    throw new Error("Gym not found");
  }

  return prisma.gym.update({
    where: {
      id: gymId,
    },
    data: updateData,
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

    return {
      capacity,
      booked,
      available: Math.max(0, capacity - booked),
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

module.exports = {
  getGymsService,
  gymDetails,
  createGym,
  UpdateDetails,
  checkOwnership,
  isAvailable,
  searchGymsService,
};
