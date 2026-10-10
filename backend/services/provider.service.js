const prisma = require("../config/prisma");

const VALID_PROVIDER_TYPES = [
  "TRAINER",
  "PHYSIOTHERAPIST",
  "NUTRITION_CONSULTANT",
];

const searchProvidersService = async ({
  name,
  type,
  gymId,
  specialization,
}) => {
  const where = {
    isActive: true,
  };

  if (type) {
    const normalizedType = String(type).trim().toUpperCase();

    if (!VALID_PROVIDER_TYPES.includes(normalizedType)) {
      throw new Error(
        `Invalid provider type. Allowed values: ${VALID_PROVIDER_TYPES.join(", ")}`,
      );
    }

    where.type = normalizedType;
  }

  if (name) {
    const searchName = String(name).trim();

    if (searchName) {
      where.name = {
        contains: searchName,
        mode: "insensitive",
      };
    }
  }

  if (gymId !== undefined && gymId !== "") {
    const id = Number(gymId);

    if (!Number.isSafeInteger(id) || id <= 0) {
      throw new Error("Invalid gym ID");
    }

    // Gym-based providers belong to that gym.
    // Nutrition consultants with gymId=null are platform-wide.
    where.OR = [
      { gymId: id },
      {
        type: "NUTRITION_CONSULTANT",
        gymId: null,
      },
    ];
  }

  if (specialization) {
    const value = String(specialization).trim();

    if (value) {
      where.specializations = {
        has: value,
      };
    }
  }

  return prisma.provider.findMany({
    where,
    select: {
      id: true,
      type: true,
      gymId: true,
      name: true,
      photoUrl: true,
      bio: true,
      specializations: true,
      experienceYears: true,
      certifications: true,
      ratingAvg: true,
      ratingCount: true,
      sessionsCompleted: true,
      gym: {
        select: {
          id: true,
          name: true,
          address: true,
        },
      },
    },
    orderBy: [{ ratingAvg: "desc" }, { name: "asc" }],
  });
};

module.exports = {
  searchProvidersService,
};
