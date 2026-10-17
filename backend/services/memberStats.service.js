/** Workout counters and streaks of a member. Updated by check-in; read by GET /me/stats. */
const prismaModule = require('../config/prisma');
const prisma = prismaModule.prisma || prismaModule;
const { computeStreak, effectiveStreak } = require('../utils/checkInRules');
const { toAddisDate } = require('../utils/time');

/** Called inside the check-in transaction. Returns the new stats row. */
async function recordWorkout(tx, userId, localDate) {
    await tx.$queryRaw`
        SELECT "id"
        FROM "User"
        WHERE "id" = ${userId}
        FOR UPDATE
    `;
    const existing = await tx.memberStats.findUnique({ where: { userId } });
    const next = computeStreak(existing, localDate);
    return tx.memberStats.upsert({ where: { userId }, create: { userId, ...next }, update: next });
}

async function getMyStats(userId) {
    const today = toAddisDate(new Date());
    const stats = await prisma.memberStats.findUnique({ where: { userId } });
    return {
        totalWorkouts: stats ? stats.totalWorkouts : 0,
        currentStreak: effectiveStreak(stats, today), // 0 once a day was missed, even if the row still says 3
        longestStreak: stats ? stats.longestStreak : 0,
        lastWorkoutLocalDate: stats ? stats.lastWorkoutLocalDate : null,
        workedOutToday: Boolean(stats && stats.lastWorkoutLocalDate === today),
    };
}

module.exports = { recordWorkout, getMyStats };
