/**
 * Badges. Other code calls ONE function:   awardBadges(tx, { userId } | { providerId }, event)
 *
 *   event 'CHECK_IN'           member    FIRST_WORKOUT, STREAK_3, STREAK_7, STREAK_30   (call AFTER the stats were updated)
 *   event 'SESSION_COMPLETED'  provider  FIRST_SESSION, SESSIONS_50, SESSIONS_100        (call AFTER sessionsCompleted was incremented)
 *   event 'RATING'             provider  RATING_4_5 (average >= 4.5 with at least 10 reviews)   (call AFTER ratingAvg/ratingCount were updated)
 *
 * It awards what is earned and not yet owned, and returns ONLY the newly awarded badges: [{ code, name }].
 * Safe to call repeatedly or concurrently (unique constraint + skipDuplicates).
 */
const prismaModule = require('../config/prisma');
const prisma = prismaModule.prisma || prismaModule;

const STREAK_BADGES = [['STREAK_3', 3], ['STREAK_7', 7], ['STREAK_30', 30]];
const SESSION_BADGES = [['FIRST_SESSION', 1], ['SESSIONS_50', 50], ['SESSIONS_100', 100]];

async function earnedCodes(tx, target, event) {
    if (target.userId && event === 'CHECK_IN') {
        const s = await tx.memberStats.findUnique({ where: { userId: target.userId } });
        if (!s) return [];
        const codes = [];
        if (s.totalWorkouts >= 1) codes.push('FIRST_WORKOUT');
        for (const [code, days] of STREAK_BADGES) if (s.currentStreak >= days) codes.push(code);
        return codes;
    }
    if (target.providerId && event === 'SESSION_COMPLETED') {
        const p = await tx.provider.findUnique({ where: { id: target.providerId }, select: { sessionsCompleted: true } });
        if (!p) return [];
        return SESSION_BADGES.filter(([, n]) => p.sessionsCompleted >= n).map(([code]) => code);
    }
    if (target.providerId && event === 'RATING') {
        const p = await tx.provider.findUnique({ where: { id: target.providerId }, select: { ratingAvg: true, ratingCount: true } });
        return p && p.ratingCount >= 10 && p.ratingAvg >= 4.5 ? ['RATING_4_5'] : [];
    }
    return [];
}

async function awardBadges(tx, target, event) {
    const codes = await earnedCodes(tx, target, event);
    if (codes.length === 0) return [];

    const owner = target.userId ? { userId: target.userId } : { providerId: target.providerId };
    const badges = await tx.badge.findMany({ where: { code: { in: codes } } });
    const owned = await tx.userBadge.findMany({ where: { ...owner, badgeId: { in: badges.map((b) => b.id) } } });
    const ownedIds = new Set(owned.map((o) => o.badgeId));
    const fresh = badges.filter((b) => !ownedIds.has(b.id));
    if (fresh.length === 0) return [];

    await tx.userBadge.createMany({ data: fresh.map((b) => ({ badgeId: b.id, ...owner })), skipDuplicates: true });
    return fresh.map((b) => ({ code: b.code, name: b.name }));
}

/** GET /me/badges: earned and locked badges for the caller's audience (members see member badges, trainers/physios provider badges). */
async function getMyBadges(auth) {
    const isMember = auth.role === 'MEMBER';
    const all = await prisma.badge.findMany({ where: { audience: isMember ? 'MEMBER' : 'PROVIDER' }, orderBy: { id: 'asc' } });
    const mine = await prisma.userBadge.findMany({ where: isMember ? { userId: auth.userId } : { providerId: auth.providerId } });
    const awardedAt = new Map(mine.map((m) => [m.badgeId, m.awardedAt]));
    return {
        earned: all.filter((b) => awardedAt.has(b.id)).map((b) => ({ code: b.code, name: b.name, awardedAt: awardedAt.get(b.id) })),
        locked: all.filter((b) => !awardedAt.has(b.id)).map((b) => ({ code: b.code, name: b.name })),
    };
}

module.exports = { awardBadges, getMyBadges };