const prismaModule = require("../config/prisma");
const prisma = prismaModule.prisma || prismaModule;
const { awardBadges } = require("./badge.service");

function serviceError(code, message) {
  const error = new Error(message);
  error.code = code;
  return error;
}

async function createSessionReview(userId, sessionId, input) {
  const memberId = Number(userId);
  const id = Number(sessionId);

  if (!Number.isSafeInteger(memberId) || memberId <= 0) {
    throw serviceError("BAD_REQUEST", "Invalid member ID");
  }

  if (!Number.isSafeInteger(id) || id <= 0) {
    throw serviceError("BAD_REQUEST", "Invalid session ID");
  }

  const rating = input.rating;
  const comment = input.comment ?? null;

  if (!Number.isInteger(rating) || rating < 1 || rating > 5) {
    throw serviceError(
      "BAD_REQUEST",
      "Rating must be an integer between 1 and 5",
    );
  }

  if (comment !== null && typeof comment !== "string") {
    throw serviceError("BAD_REQUEST", "Comment must be a string");
  }

  if (comment !== null && comment.length > 500) {
    throw serviceError("BAD_REQUEST", "Comment must not exceed 500 characters");
  }

  try {
    return await prisma.$transaction(
      async (tx) => {
        const session = await tx.trainingSession.findUnique({
          where: { id },
          select: {
            id: true,
            userId: true,
            providerId: true,
            status: true,
          },
        });

        if (!session) {
          throw serviceError("NOT_FOUND", "Session not found");
        }

        if (session.userId !== memberId) {
          throw serviceError(
            "FORBIDDEN",
            "You can only review your own sessions",
          );
        }

        if (session.status !== "COMPLETED") {
          throw serviceError(
            "BAD_REQUEST",
            "Only completed sessions can be reviewed",
          );
        }

        const existingReview = await tx.review.findUnique({
          where: { sessionId: id },
          select: { id: true },
        });

        if (existingReview) {
          throw serviceError(
            "ALREADY_EXISTS",
            "This session has already been reviewed",
          );
        }

        const review = await tx.review.create({
          data: {
            sessionId: id,
            userId: memberId,
            providerId: session.providerId,
            rating,
            comment: comment === null ? null : comment.trim(),
          },
          select: {
            id: true,
            sessionId: true,
            providerId: true,
            rating: true,
            comment: true,
            createdAt: true,
          },
        });

        // Recalculate from the actual reviews instead of guessing.
        const aggregate = await tx.review.aggregate({
          where: { providerId: session.providerId },
          _avg: { rating: true },
          _count: { _all: true },
        });

        const ratingAvg = aggregate._avg.rating ?? 0;
        const ratingCount = aggregate._count._all;

        await tx.provider.update({
          where: { id: session.providerId },
          data: { ratingAvg, ratingCount },
        });

        // Award any eligible rating badge in the same transaction.
        const awardedBadges = await awardBadges(
          tx,
          { providerId: session.providerId },
          "RATING",
        );

        return {
          review,
          providerRating: { ratingAvg, ratingCount },
          awardedBadges,
        };
      },
      { isolationLevel: "Serializable" },
    );
  } catch (error) {
    // A unique constraint is the final safeguard against duplicate reviews.
    if (error.code === "P2002") {
      throw serviceError(
        "ALREADY_EXISTS",
        "This session has already been reviewed",
      );
    }

    throw error;
  }
}

async function getMemberSessionReviews(userId) {
  const memberId = Number(userId);
  if (!Number.isSafeInteger(memberId) || memberId <= 0) {
    throw serviceError("BAD_REQUEST", "Invalid member ID");
  }

  return prisma.review.findMany({
    where: { userId: memberId },
    orderBy: { createdAt: "desc" },
    select: {
      id: true,
      sessionId: true,
      providerId: true,
      rating: true,
      comment: true,
      createdAt: true,
      provider: { select: { id: true, name: true, type: true, photoUrl: true } },
      session: {
        select: {
          startsAt: true,
          endsAt: true,
          booking: {
            select: {
              gym: { select: { id: true, name: true } },
              package: { select: { id: true, name: true } },
            },
          },
        },
      },
    },
  });
}

module.exports = { createSessionReview, getMemberSessionReviews };
