const prismaModule = require("../config/prisma");
const prisma = prismaModule.prisma || prismaModule;
const { AppError } = require("../utils/errors");
const { toId } = require("../utils/scope");
const { parsePagination, paginated } = require("../utils/pagination");

async function getProviderReviews(providerId, query = {}) {
  const id = toId(providerId, "providerId");
  const pagination = parsePagination(query);

  const provider = await prisma.provider.findUnique({
    where: { id },
    select: { id: true },
  });

  if (!provider) {
    throw new AppError("NOT_FOUND", "Provider not found");
  }

  const where = { providerId: id };

  const [reviews, total] = await Promise.all([
    prisma.review.findMany({
      where,
      orderBy: [{ createdAt: "desc" }, { id: "desc" }],
      skip: pagination.skip,
      take: pagination.take,
      select: {
        id: true,
        rating: true,
        comment: true,
        createdAt: true,
        user: {
          select: { name: true },
        },
      },
    }),
    prisma.review.count({ where }),
  ]);

  const items = reviews.map(({ user, ...review }) => ({
    ...review,
    reviewerFirstName: user.name.trim().split(/\s+/)[0] || "Member",
  }));

  return paginated(items, total, pagination);
}

module.exports = { getProviderReviews };
