const prismaModule = require("../config/prisma");
const prisma = prismaModule.prisma || prismaModule;

const { AppError } = require("../utils/errors");
const { assertAdminOwnsGym, adminGymIds, toId } = require("../utils/scope");
const { hashPassword, generateTempPassword } = require("../utils/password");
const { parsePagination, paginated } = require("../utils/pagination");
const { getValidSessionStarts } = require("./bookingHelpers.service");

const VALID_PROVIDER_TYPES = [
  "TRAINER",
  "PHYSIOTHERAPIST",
  "NUTRITION_CONSULTANT",
];

const GYM_SELECT = {
  select: {
    id: true,
    name: true,
    adminId: true,
  },
};

const PUBLIC_PROVIDER_SELECT = {
  id: true,
  type: true,
  gymId: true,
  name: true,
  phone: true,
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
};

function normalizeProviderType(value) {
  if (value === undefined || value === null || value === "") {
    return undefined;
  }

  const type = String(value).trim().toUpperCase();

  if (!VALID_PROVIDER_TYPES.includes(type)) {
    throw new AppError(
      "VALIDATION",
      `Invalid provider type. Allowed values: ${VALID_PROVIDER_TYPES.join(", ")}`,
    );
  }

  return type;
}

function parseDateWindow(startsAt, endsAt) {
  if (!startsAt || !endsAt) {
    throw new AppError("VALIDATION", "Both startsAt and endsAt are required");
  }

  const start = new Date(startsAt);
  const end = new Date(endsAt);

  if (
    !Number.isFinite(start.getTime()) ||
    !Number.isFinite(end.getTime()) ||
    start >= end
  ) {
    throw new AppError(
      "VALIDATION",
      "Invalid date window: startsAt must be before endsAt",
    );
  }

  return { start, end };
}

function toPublicProvider(provider) {
  return {
    id: provider.id,
    type: provider.type,
    gymId: provider.gymId,
    ...(provider.gym ? { gymName: provider.gym.name } : {}),
    name: provider.name,
    email: provider.email,
    phone: provider.phone,
    photoUrl: provider.photoUrl,
    bio: provider.bio,
    specializations: provider.specializations,
    experienceYears: provider.experienceYears,
    certifications: provider.certifications,
    sharePercent: provider.sharePercent,
    isActive: provider.isActive,
    mustChangePassword: provider.mustChangePassword,
    ratingAvg: provider.ratingAvg,
    ratingCount: provider.ratingCount,
    sessionsCompleted: provider.sessionsCompleted,
    createdAt: provider.createdAt,
    ...(provider.availability !== undefined
      ? { availability: provider.availability }
      : {}),
    ...(provider.packages !== undefined ? { packages: provider.packages } : {}),
  };
}

// --------------------------------------------------
// Provider search
// GET /api/providers/search
// --------------------------------------------------

async function searchProvidersService({ name, type, gymId, specialization }) {
  const where = {
    isActive: true,
  };

  const normalizedType = normalizeProviderType(type);

  if (normalizedType) {
    where.type = normalizedType;
  }

  if (name && String(name).trim()) {
    where.name = {
      contains: String(name).trim(),
      mode: "insensitive",
    };
  }

  if (gymId !== undefined && gymId !== "") {
    const id = toId(gymId, "gymId");

    where.OR = [
      { gymId: id },
      {
        type: "NUTRITION_CONSULTANT",
        gymId: null,
      },
    ];
  }

  if (specialization && String(specialization).trim()) {
    where.specializations = {
      has: String(specialization).trim(),
    };
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
}

// --------------------------------------------------
// Shared admin ownership lookup
// --------------------------------------------------

async function getOwnedProvider(adminId, providerId, include = {}) {
  const id = toId(providerId, "providerId");

  const provider = await prisma.provider.findUnique({
    where: { id },
    include: {
      ...include,
      gym: GYM_SELECT,
    },
  });

  if (!provider) {
    throw new AppError("NOT_FOUND", "Provider not found");
  }

  if (!provider.gym || String(provider.gym.adminId) !== String(adminId)) {
    throw new AppError("FORBIDDEN", "This provider is not in one of your gyms");
  }

  return provider;
}

// --------------------------------------------------
// Create provider
// POST /api/providers
// --------------------------------------------------

async function createProvider(adminId, input) {
  if (!input || typeof input !== "object") {
    throw new AppError("VALIDATION", "Invalid provider input");
  }

  const gymId = toId(input.gymId, "gymId");
  await assertAdminOwnsGym(adminId, gymId);

  const type = normalizeProviderType(input.type);

  if (!type || !["TRAINER", "PHYSIOTHERAPIST"].includes(type)) {
    throw new AppError(
      "VALIDATION",
      "Only trainers and physiotherapists can be created by a gym admin",
    );
  }

  if (!input.name || !String(input.name).trim()) {
    throw new AppError("VALIDATION", "Provider name is required");
  }

  if (!input.email || !String(input.email).trim()) {
    throw new AppError("VALIDATION", "Provider email is required");
  }

  const email = String(input.email).trim().toLowerCase();

  const existing = await prisma.provider.findUnique({
    where: { email },
    select: { id: true },
  });

  if (existing) {
    throw new AppError(
      "ALREADY_EXISTS",
      "A provider with this email already exists",
    );
  }

  const generatedPassword = input.password ? null : generateTempPassword();

  const password = input.password || generatedPassword;

  const provider = await prisma.provider.create({
    data: {
      type,
      gymId,
      name: String(input.name).trim(),
      email,
      phone: input.phone ?? null,
      password: await hashPassword(password),
      mustChangePassword: true,
      bio: input.bio ?? null,
      specializations: input.specializations ?? [],
      experienceYears: input.experienceYears ?? 0,
      certifications: input.certifications ?? [],
      sharePercent: input.sharePercent,
    },
    include: {
      gym: GYM_SELECT,
    },
  });

  return {
    ...toPublicProvider(provider),
    ...(generatedPassword ? { temporaryPassword: generatedPassword } : {}),
  };
}

// --------------------------------------------------
// List providers managed by a gym admin
// GET /api/providers/admin/manage
// --------------------------------------------------

async function listProviders(adminId, query = {}, rawPagination = {}) {
  const gymIds = await adminGymIds(adminId);

  let where = {
    gymId: {
      in: gymIds.map((id) => Number(id)),
    },
  };

  if (query.gymId !== undefined && query.gymId !== "") {
    const gymId = toId(query.gymId, "gymId");

    await assertAdminOwnsGym(adminId, gymId);

    where.gymId = gymId;
  }

  const type = normalizeProviderType(query.type);

  if (type) {
    if (type === "NUTRITION_CONSULTANT") {
      throw new AppError(
        "VALIDATION",
        "Nutrition consultants are not managed by gym admins",
      );
    }

    where.type = type;
  }

  if (query.isActive !== undefined) {
    if (typeof query.isActive !== "boolean") {
      throw new AppError("VALIDATION", "isActive must be a boolean");
    }

    where.isActive = query.isActive;
  }

  const pagination = parsePagination(rawPagination);

  const [rows, total] = await Promise.all([
    prisma.provider.findMany({
      where,
      include: {
        gym: GYM_SELECT,
      },
      orderBy: {
        createdAt: "desc",
      },
      skip: pagination.skip,
      take: pagination.take,
    }),
    prisma.provider.count({ where }),
  ]);

  return paginated(rows.map(toPublicProvider), total, pagination);
}

// --------------------------------------------------
// Get one managed provider
// GET /api/providers/admin/manage/:id
// --------------------------------------------------

async function getProvider(adminId, providerId) {
  const provider = await getOwnedProvider(adminId, providerId, {
    availability: true,
    packages: true,
  });

  return toPublicProvider(provider);
}

// --------------------------------------------------
// Update managed provider
// PATCH /api/providers/admin/manage/:id
// --------------------------------------------------

async function updateProvider(adminId, providerId, input) {
  const provider = await getOwnedProvider(adminId, providerId);

  const allowedFields = [
    "name",
    "phone",
    "photoUrl",
    "bio",
    "specializations",
    "experienceYears",
    "certifications",
    "sharePercent",
    "isActive",
  ];

  const data = {};

  for (const field of allowedFields) {
    if (input[field] !== undefined) {
      data[field] = input[field];
    }
  }

  if (Object.keys(data).length === 0) {
    throw new AppError(
      "VALIDATION",
      "No editable provider fields were supplied",
    );
  }

  if (data.name !== undefined) {
    if (!String(data.name).trim()) {
      throw new AppError("VALIDATION", "Provider name cannot be empty");
    }

    data.name = String(data.name).trim();
  }

  const updated = await prisma.provider.update({
    where: { id: provider.id },
    data,
    include: {
      gym: GYM_SELECT,
    },
  });

  return toPublicProvider(updated);
}

// --------------------------------------------------
// Reset provider password
// POST /api/providers/admin/manage/:id/reset-password
// --------------------------------------------------

async function resetProviderPassword(adminId, providerId) {
  const provider = await getOwnedProvider(adminId, providerId);

  const temporaryPassword = generateTempPassword();

  await prisma.provider.update({
    where: { id: provider.id },
    data: {
      password: await hashPassword(temporaryPassword),
      mustChangePassword: true,
    },
  });

  return {
    id: provider.id,
    temporaryPassword,
  };
}

// --------------------------------------------------
// Public provider packages
// GET /api/providers/:id/packages
// --------------------------------------------------

async function getPublicProviderPackages(providerId) {
  const id = toId(providerId, "providerId");

  const provider = await prisma.provider.findFirst({
    where: {
      id,
      isActive: true,
      type: {
        in: ["TRAINER", "PHYSIOTHERAPIST"],
      },
    },
    select: { id: true },
  });

  if (!provider) {
    throw new AppError("NOT_FOUND", "Provider not found");
  }

  const packages = await prisma.providerPackage.findMany({
    where: {
      providerId: id,
      isActive: true,
    },
    select: {
      id: true,
      name: true,
      description: true,
      sessionCount: true,
      price: true,
      validityDays: true,
    },
    orderBy: { createdAt: "desc" },
  });

  return packages.map((pkg) => ({
    ...pkg,
    price: Number(pkg.price),
  }));
}

// --------------------------------------------------
// Public provider availability
// GET /api/providers/:id/availability
// --------------------------------------------------

async function getPublicProviderAvailability(providerId) {
  const id = toId(providerId, "providerId");

  const provider = await prisma.provider.findFirst({
    where: {
      id,
      isActive: true,
      type: {
        in: ["TRAINER", "PHYSIOTHERAPIST"],
      },
    },
    select: { id: true },
  });

  if (!provider) {
    throw new AppError("NOT_FOUND", "Provider not found");
  }

  const rows = await prisma.providerAvailability.findMany({
    where: { providerId: id },
    select: {
      dayOfWeek: true,
      period: true,
    },
    orderBy: [{ dayOfWeek: "asc" }, { period: "asc" }],
  });

  return {
    slots: rows,
  };
}

// --------------------------------------------------
// Gym provider discovery
// --------------------------------------------------

async function getPublicProvidersAtGym(gymId, { type, startsAt, endsAt }) {
  const id = toId(gymId, "gymId");
  const { start, end } = parseDateWindow(startsAt, endsAt);

  const gym = await prisma.gym.findFirst({
    where: {
      id,
      isActive: true,
    },
    select: { id: true },
  });

  if (!gym) {
    throw new AppError("NOT_FOUND", "Gym not found");
  }

  const normalizedType = normalizeProviderType(type);

  if (
    normalizedType &&
    !["TRAINER", "PHYSIOTHERAPIST"].includes(normalizedType)
  ) {
    throw new AppError("VALIDATION", "type must be TRAINER or PHYSIOTHERAPIST");
  }

  const providers = await prisma.provider.findMany({
    where: {
      gymId: id,
      isActive: true,
      type: normalizedType
        ? normalizedType
        : { in: ["TRAINER", "PHYSIOTHERAPIST"] },
    },
    select: PUBLIC_PROVIDER_SELECT,
    orderBy: [{ ratingAvg: "desc" }, { name: "asc" }],
  });

  const results = await Promise.all(
    providers.map(async (provider) => {
      const slots = await getValidSessionStarts(
        prisma,
        provider.id,
        start,
        end,
      );

      return {
        ...provider,
        validSessionStarts: slots.map((date) => date.toISOString()),
      };
    }),
  );

  return results.filter((provider) => provider.validSessionStarts.length > 0);
}

// --------------------------------------------------
// Public provider details
// GET /api/providers/:id
// --------------------------------------------------

async function getPublicProviderDetails(providerId) {
  const id = toId(providerId, "providerId");

  const provider = await prisma.provider.findFirst({
    where: {
      id,
      isActive: true,
      type: {
        in: ["TRAINER", "PHYSIOTHERAPIST"],
      },
    },
    select: PUBLIC_PROVIDER_SELECT,
  });

  if (!provider) {
    throw new AppError("NOT_FOUND", "Provider not found");
  }

  const [packages, availability] = await Promise.all([
    prisma.providerPackage.findMany({
      where: {
        providerId: id,
        isActive: true,
      },
      select: {
        id: true,
        name: true,
        sessionCount: true,
        price: true,
        validityDays: true,
      },
      orderBy: { createdAt: "desc" },
    }),

    prisma.providerAvailability.findMany({
      where: { providerId: id },
      select: {
        dayOfWeek: true,
        period: true,
      },
      orderBy: [{ dayOfWeek: "asc" }, { period: "asc" }],
    }),
  ]);

  return {
    ...provider,
    packages: packages.map((pkg) => ({
      ...pkg,
      price: Number(pkg.price),
    })),
    availability: {
      slots: availability,
    },
  };
}

// --------------------------------------------------
// Gym admin's alternate provider discovery
// --------------------------------------------------

async function getGymProviders(gymId, options = {}) {
  const id = toId(gymId, "gymId");

  const gym = await prisma.gym.findUnique({
    where: { id },
    select: { id: true, isActive: true },
  });

  if (!gym || !gym.isActive) {
    throw new AppError("NOT_FOUND", "Gym not found");
  }

  const type = normalizeProviderType(options.type);

  if (type && !["TRAINER", "PHYSIOTHERAPIST"].includes(type)) {
    throw new AppError("VALIDATION", "type must be TRAINER or PHYSIOTHERAPIST");
  }

  const where = {
    gymId: id,
    isActive: true,
    type: type || {
      in: ["TRAINER", "PHYSIOTHERAPIST"],
    },
  };

  const providers = await prisma.provider.findMany({
    where,
    select: {
      id: true,
      type: true,
      name: true,
      photoUrl: true,
      bio: true,
      specializations: true,
      experienceYears: true,
      certifications: true,
      ratingAvg: true,
      ratingCount: true,
      sessionsCompleted: true,
      availability: {
        select: {
          dayOfWeek: true,
          period: true,
        },
      },
    },
    orderBy: [{ ratingAvg: "desc" }, { name: "asc" }],
  });

  if (!options.startsAt || !options.endsAt) {
    return providers.map(({ availability, ...provider }) => provider);
  }

  const { start, end } = parseDateWindow(options.startsAt, options.endsAt);

  const results = await Promise.all(
    providers.map(async (provider) => {
      const slots = await getValidSessionStarts(
        prisma,
        provider.id,
        start,
        end,
      );

      return {
        ...provider,
        hasValidSession: slots.length > 0,
      };
    }),
  );

  return results
    .filter((provider) => provider.hasValidSession)
    .map(({ hasValidSession, availability, ...provider }) => provider);
}

// --------------------------------------------------
// Legacy public detail service
// --------------------------------------------------

async function getMemberProviderDetail(providerId, { startsAt, endsAt } = {}) {
  if (!startsAt || !endsAt) {
    throw new AppError("VALIDATION", "Both startsAt and endsAt are required");
  }

  return getPublicProviderDetails(providerId, startsAt, endsAt);
}

module.exports = {
  searchProvidersService,
  createProvider,
  listProviders,
  getProvider,
  updateProvider,
  resetProviderPassword,
  getPublicProviderPackages,
  getPublicProviderAvailability,
  getGymProviders,
  getMemberProviderDetail,
  getPublicProviderDetails,
  getPublicProvidersAtGym: getPublicProvidersAtGym,
};
