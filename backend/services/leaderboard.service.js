const prismaModule = require("../config/prisma");
const prisma = prismaModule.prisma || prismaModule;
const { AppError } = require("../utils/errors");
const { parsePagination, paginated } = require("../utils/pagination");

const VALID_PROVIDER_TYPES = [
  "TRAINER",
  "PHYSIOTHERAPIST",
  "NUTRITION_CONSULTANT",
];

async function getProviderLeaderboard({ gymId, type, query = {} }) {
  const normalizedType = type ? String(type).trim().toUpperCase() : undefined;

  if (normalizedType && !VALID_PROVIDER_TYPES.includes(normalizedType)) {
    throw new AppError(
      "VALIDATION",
      `Invalid provider type. Allowed values: ${VALID_PROVIDER_TYPES.join(", ")}`,
    );
  }

  const pagination = parsePagination(query);

  const where = {
    gymId,
    isActive: true,
    ratingCount: { gte: 3 },
    ...(normalizedType ? { type: normalizedType } : {}),
  };

  const [providers, total] = await Promise.all([
    prisma.provider.findMany({
      where,
      select: {
        id: true,
        name: true,
        type: true,
        gymId: true,
        photoUrl: true,
        ratingAvg: true,
        ratingCount: true,
        sessionsCompleted: true,
      },
      orderBy: [{ ratingAvg: "desc" }, { sessionsCompleted: "desc" }],
      skip: pagination.skip,
      take: pagination.take,
    }),
    prisma.provider.count({ where }),
  ]);

  const rankedProviders = providers.map((provider, index) => ({
    rank: pagination.skip + index + 1,
    ...provider,
  }));

  return paginated(rankedProviders, total, pagination);
}

module.exports = { getProviderLeaderboard };
