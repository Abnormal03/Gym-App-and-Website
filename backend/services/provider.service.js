/**
 * Trainer / physiotherapist accounts, managed by the gym ADMIN of the gym they belong to.
 * Nutrition consultants are NOT managed here (they have no gym; the dev team seeds them).
 * Rule: the admin can never change a provider's type, email or gym, and never sees their password hash.
 */
const prismaModule = require("../config/prisma");
const prisma = prismaModule.prisma || prismaModule;
const { AppError } = require("../utils/errors");
const { assertAdminOwnsGym, adminGymIds, toId } = require("../utils/scope");
const { hashPassword, generateTempPassword } = require("../utils/password");
const { parsePagination, paginated } = require("../utils/pagination");
const { getValidSessionStarts } = require("./bookingHelpers.service");
const { parseUtcInstant } = require("../utils/time");

const VALID_PROVIDER_TYPES = [
  "TRAINER",
  "PHYSIOTHERAPIST",
  "NUTRITION_CONSULTANT",
];

const toPublicProvider = (p) => ({
  id: p.id,
  type: p.type,
  gymId: p.gymId,
  gymName: p.gym ? p.gym.name : undefined,
  name: p.name,
  email: p.email,
  phone: p.phone,
  photoUrl: p.photoUrl,
  bio: p.bio,
  specializations: p.specializations,
  experienceYears: p.experienceYears,
  certifications: p.certifications,
  sharePercent: p.sharePercent,
  isActive: p.isActive,
  mustChangePassword: p.mustChangePassword,
  ratingAvg: p.ratingAvg,
  ratingCount: p.ratingCount,
  sessionsCompleted: p.sessionsCompleted,
  createdAt: p.createdAt,
  ...(p.availability ? { availability: p.availability } : {}),
  ...(p.packages ? { packages: p.packages } : {}),
});

const GYM_SELECT = { select: { id: true, name: true, adminId: true } };

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

async function getOwnedProvider(adminId, providerId, include = {}) {
  const provider = await prisma.provider.findUnique({
    where: { id: toId(providerId, "providerId") },
    include: { gym: GYM_SELECT, ...include },
  });
  if (!provider) throw new AppError("NOT_FOUND", "Provider not found");
  if (!provider.gym || provider.gym.adminId !== adminId) {
    throw new AppError("FORBIDDEN", "This provider is not in one of your gyms");
  }
  return provider;
}

async function createProvider(adminId, input) {
  await assertAdminOwnsGym(adminId, input.gymId);
  if (await prisma.provider.findUnique({ where: { email: input.email } })) {
    throw new AppError(
      "ALREADY_EXISTS",
      "A provider with this email already exists",
    );
  }

  const generated = input.password ? null : generateTempPassword();
  const provider = await prisma.provider.create({
    data: {
      type: input.type,
      gymId: input.gymId,
      name: input.name,
      email: input.email,
      phone: input.phone ?? null,
      password: await hashPassword(input.password ?? generated),
      mustChangePassword: true,
      bio: input.bio ?? null,
      specializations: input.specializations,
      experienceYears: input.experienceYears,
      certifications: input.certifications,
      sharePercent: input.sharePercent,
    },
  });
  return {
    ...toPublicProvider(provider),
    ...(generated ? { temporaryPassword: generated } : {}),
  };
}

async function listProviders(adminId, query, rawPagination) {
  const gymIds = await adminGymIds(adminId);
  let where = { gymId: { in: gymIds } };
  if (query.gymId) {
    await assertAdminOwnsGym(adminId, query.gymId);
    where = { gymId: query.gymId };
  }
  if (query.type) where.type = query.type;
  if (query.isActive !== undefined) where.isActive = query.isActive;

  const pg = parsePagination(rawPagination);
  const [rows, total] = await Promise.all([
    prisma.provider.findMany({
      where,
      include: { gym: GYM_SELECT },
      orderBy: { createdAt: "desc" },
      skip: pg.skip,
      take: pg.take,
    }),
    prisma.provider.count({ where }),
  ]);
  return paginated(rows.map(toPublicProvider), total, pg);
}

async function getProvider(adminId, providerId) {
  const provider = await getOwnedProvider(adminId, providerId, {
    availability: true,
    packages: true,
  });
  return toPublicProvider(provider);
}

async function updateProvider(adminId, providerId, input) {
  const provider = await getOwnedProvider(adminId, providerId);
  const updated = await prisma.provider.update({
    where: { id: provider.id },
    data: input,
    include: { gym: GYM_SELECT },
  });
  return toPublicProvider(updated);
}

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
  return { id: provider.id, temporaryPassword };
}

async function getPublicProviderPackages(providerId) {
  const id = toId(providerId, "providerId");

  const provider = await prisma.provider.findFirst({
    where: {
      id,
      isActive: true,
      type: { in: ["TRAINER", "PHYSIOTHERAPIST"] },
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

async function getPublicProviderAvailability(providerId) {
  const id = toId(providerId, "providerId");

  const provider = await prisma.provider.findFirst({
    where: {
      id,
      isActive: true,
      type: { in: ["TRAINER", "PHYSIOTHERAPIST"] },
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
    slots: rows.map((slot) => ({
      dayOfWeek: slot.dayOfWeek,
      period: slot.period,
    })),
  };
}

/**
 * B-1: GET /api/gyms/:id/providers?type=&startsAt=&endsAt=
 * Returns active providers at a gym who have at least one valid session slot
 * within the [startsAt, endsAt) window. When no window is given, returns all
 * active providers for the gym.
 */
async function getGymProviders(gymId, { type, startsAt, endsAt }) {
  const id = toId(gymId, "gymId");

  const gym = await prisma.gym.findUnique({
    where: { id },
    select: { id: true, isActive: true },
  });
  if (!gym || !gym.isActive) throw new AppError("NOT_FOUND", "Gym not found");

  const where = {
    gymId: id,
    isActive: true,
    type: { in: ["TRAINER", "PHYSIOTHERAPIST"] },
  };

  if (type) {
    const normalized = String(type).trim().toUpperCase();
    if (!["TRAINER", "PHYSIOTHERAPIST"].includes(normalized)) {
      throw new AppError(
        "VALIDATION",
        "type must be TRAINER or PHYSIOTHERAPIST",
      );
    }
    where.type = normalized;
  }

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
        select: { dayOfWeek: true, period: true },
      },
    },
    orderBy: [{ ratingAvg: "desc" }, { name: "asc" }],
  });

  // If no time window is provided, return all active providers.
  if (!startsAt || !endsAt) {
    return providers.map(({ availability, ...p }) => p);
  }

  const windowStart = parseUtcInstant(startsAt);
  const windowEnd = parseUtcInstant(endsAt);

  if (
    Number.isNaN(windowStart.getTime()) ||
    Number.isNaN(windowEnd.getTime()) ||
    windowStart >= windowEnd
  ) {
    throw new AppError("VALIDATION", "Invalid startsAt / endsAt window");
  }

  // Re-use the existing getValidSessionStarts helper (needs a prisma client
  // that exposes providerAvailability and trainingSession – prisma itself).
  const { getValidSessionStarts } = require("./bookingHelpers.service");

  const results = [];
  for (const provider of providers) {
    const slots = await getValidSessionStarts(
      prisma,
      provider.id,
      windowStart,
      windowEnd,
    );
    if (slots.length > 0) {
      const { availability, ...rest } = provider;
      results.push(rest);
    }
  }
  return results;
}

/**
 * B-1: GET /api/providers/:id?startsAt=&endsAt=
 * Returns profile + active packages + availability + validSessionStarts for
 * the given window.
 */
async function getMemberProviderDetail(providerId, { startsAt, endsAt }) {
  const id = toId(providerId, "providerId");

  const provider = await prisma.provider.findFirst({
    where: {
      id,
      isActive: true,
      type: { in: ["TRAINER", "PHYSIOTHERAPIST"] },
    },
    select: {
      id: true,
      type: true,
      gymId: true,
      name: true,
      email: true,
      phone: true,
      photoUrl: true,
      bio: true,
      specializations: true,
      experienceYears: true,
      certifications: true,
      ratingAvg: true,
      ratingCount: true,
      sessionsCompleted: true,
      gym: { select: { id: true, name: true, address: true } },
      availability: {
        select: { dayOfWeek: true, period: true },
        orderBy: [{ dayOfWeek: "asc" }, { period: "asc" }],
      },
      packages: {
        where: { isActive: true },
        select: {
          id: true,
          name: true,
          sessionCount: true,
          price: true,
          validityDays: true,
        },
        orderBy: { createdAt: "desc" },
      },
    },
  });

  if (!provider) throw new AppError("NOT_FOUND", "Provider not found");

  let validSessionStarts = [];

  if (startsAt && endsAt) {
    const windowStart = parseUtcInstant(startsAt);
    const windowEnd = parseUtcInstant(endsAt);

    if (
      Number.isNaN(windowStart.getTime()) ||
      Number.isNaN(windowEnd.getTime()) ||
      windowStart >= windowEnd
    ) {
      throw new AppError("VALIDATION", "Invalid startsAt / endsAt window");
    }

    const { getValidSessionStarts } = require("./bookingHelpers.service");

    const slots = await getValidSessionStarts(
      prisma,
      provider.id,
      windowStart,
      windowEnd,
    );
    validSessionStarts = slots.map((d) => d.toISOString());
  }

  return {
    id: provider.id,
    type: provider.type,
    gymId: provider.gymId,
    gym: provider.gym,
    name: provider.name,
    email: provider.email,
    phone: provider.phone,
    photoUrl: provider.photoUrl,
    bio: provider.bio,
    specializations: provider.specializations,
    experienceYears: provider.experienceYears,
    certifications: provider.certifications,
    ratingAvg: provider.ratingAvg,
    ratingCount: provider.ratingCount,
    sessionsCompleted: provider.sessionsCompleted,
    availability: provider.availability,
    packages: provider.packages.map((pkg) => ({
      ...pkg,
      price: Number(pkg.price),
    })),
    validSessionStarts,
  };
}

/**
 * Validate the requested time window.
 * Dates are interpreted as instants; return values are ISO UTC strings.
 */
function parseProviderWindow(startsAt, endsAt) {
  if (!startsAt || !endsAt) {
    throw new AppError(
      "VALIDATION",
      "Both startsAt and endsAt query parameters are required",
    );
  }

  const start = parseUtcInstant(startsAt);
  const end = parseUtcInstant(endsAt);

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

/**
 * GET /api/providers/:id?startsAt=...&endsAt=...
 * Public provider profile, active packages, weekly availability,
 * and valid session starts within the requested window.
 */
async function getPublicProviderDetails(providerId, startsAt, endsAt) {
  const id = toId(providerId, "providerId");
  const { start, end } = parseProviderWindow(startsAt, endsAt);

  const provider = await prisma.provider.findFirst({
    where: {
      id,
      isActive: true,
      type: { in: ["TRAINER", "PHYSIOTHERAPIST"] },
    },
    select: PUBLIC_PROVIDER_SELECT,
  });

  if (!provider) {
    throw new AppError("NOT_FOUND", "Provider not found");
  }

  const [packages, availability, validStarts] = await Promise.all([
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

    getValidSessionStarts(prisma, id, start, end),
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
    validSessionStarts: validStarts.map((date) => date.toISOString()),
  };
}

/**
 * GET /api/gyms/:id/providers?startsAt=...&endsAt=...&type=TRAINER
 * Return active providers at one active gym who have at least
 * one valid session start in the requested time window.
 */
async function getPublicProvidersAtGym(gymId, { type, startsAt, endsAt }) {
  const id = toId(gymId, "gymId");
  const { start, end } = parseProviderWindow(startsAt, endsAt);

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

  let normalizedType;

  if (type !== undefined && type !== "") {
    normalizedType = String(type).trim().toUpperCase();

    if (!["TRAINER", "PHYSIOTHERAPIST"].includes(normalizedType)) {
      throw new AppError(
        "VALIDATION",
        "type must be TRAINER or PHYSIOTHERAPIST",
      );
    }
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

  const providersWithSlots = await Promise.all(
    providers.map(async (provider) => {
      const validStarts = await getValidSessionStarts(
        prisma,
        provider.id,
        start,
        end,
      );

      return {
        ...provider,
        validSessionStarts: validStarts.map((date) => date.toISOString()),
      };
    }),
  );

  return providersWithSlots.filter(
    (provider) => provider.validSessionStarts.length > 0,
  );
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
  getPublicProvidersAtGym,
};
