async function awardBadges(tx, target, event) {
  if (event !== "RATING" || !target?.providerId) {
    return [];
  }

  const providerId = Number(target.providerId);

  const provider = await tx.provider.findUnique({
    where: { id: providerId },
    select: {
      ratingAvg: true,
      ratingCount: true,
    },
  });

  if (!provider || provider.ratingCount < 10 || provider.ratingAvg < 4.5) {
    return [];
  }

  const badge = await tx.badge.findUnique({
    where: { code: "RATING_4_5" },
  });

  if (!badge) {
    return [];
  }

  const existing = await tx.userBadge.findUnique({
    where: {
      providerId_badgeId: {
        providerId,
        badgeId: badge.id,
      },
    },
  });

  if (existing) {
    return [];
  }

  const awarded = await tx.userBadge.create({
    data: {
      providerId,
      badgeId: badge.id,
    },
    include: {
      badge: true,
    },
  });

  return [awarded];
}

module.exports = { awardBadges };
