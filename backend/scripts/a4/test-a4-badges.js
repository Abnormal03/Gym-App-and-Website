/**
 * A4 Badges Unit Tests
 * Validates badge award logic, milestone triggers, provider badges, and deduplication.
 * Run with: NODE_PATH=backend/node_modules node backend/scripts/a4/test-a4-badges.js
 */
const assert = require('node:assert/strict');
const { awardBadges } = require('../../services/badge.service');

console.log('\n--- Running A4 Badge Award Logic Tests ---');

// Mock transaction client
function createMockTx({ memberStats, provider, existingBadgeIds = [] } = {}) {
    const created = [];
    return {
        memberStats: {
            findUnique: async () => memberStats,
        },
        provider: {
            findUnique: async () => provider,
        },
        badge: {
            findMany: async ({ where }) => {
                const allBadges = [
                    { id: 1, code: 'FIRST_WORKOUT', name: 'First Workout' },
                    { id: 2, code: 'STREAK_3', name: '3-Day Streak' },
                    { id: 3, code: 'STREAK_7', name: '7-Day Streak' },
                    { id: 4, code: 'STREAK_30', name: '30-Day Streak' },
                    { id: 5, code: 'FIRST_SESSION', name: 'First Session' },
                    { id: 6, code: 'SESSIONS_50', name: '50 Sessions' },
                    { id: 7, code: 'SESSIONS_100', name: '100 Sessions' },
                    { id: 8, code: 'RATING_4_5', name: 'Top Rated (4.5+)' },
                ];
                return allBadges.filter((b) => where.code.in.includes(b.code));
            },
        },
        userBadge: {
            findMany: async () => existingBadgeIds.map((id) => ({ badgeId: id })),
            createMany: async ({ data }) => {
                created.push(...data);
                return { count: data.length };
            },
        },
        _created: created,
    };
}

async function testBadges() {
    // 1. First workout badge
    const tx1 = createMockTx({ memberStats: { totalWorkouts: 1, currentStreak: 1 } });
    const b1 = await awardBadges(tx1, { userId: 10 }, 'CHECK_IN');
    assert.equal(b1.length, 1);
    assert.equal(b1[0].code, 'FIRST_WORKOUT');
    console.log('  ✔ Awarded FIRST_WORKOUT on first workout check-in');

    // 2. 3-day streak milestone
    const tx2 = createMockTx({
        memberStats: { totalWorkouts: 3, currentStreak: 3 },
        existingBadgeIds: [1], // already has FIRST_WORKOUT
    });
    const b2 = await awardBadges(tx2, { userId: 10 }, 'CHECK_IN');
    assert.equal(b2.length, 1);
    assert.equal(b2[0].code, 'STREAK_3');
    console.log('  ✔ Awarded STREAK_3 milestone without re-awarding FIRST_WORKOUT');

    // 3. Provider session milestones
    const tx3 = createMockTx({ provider: { sessionsCompleted: 1 } });
    const b3 = await awardBadges(tx3, { providerId: 5 }, 'SESSION_COMPLETED');
    assert.equal(b3.length, 1);
    assert.equal(b3[0].code, 'FIRST_SESSION');
    console.log('  ✔ Awarded FIRST_SESSION on provider session complete');

    // 4. Provider rating badge
    const tx4 = createMockTx({ provider: { ratingAvg: 4.8, ratingCount: 12 } });
    const b4 = await awardBadges(tx4, { providerId: 5 }, 'RATING');
    assert.equal(b4.length, 1);
    assert.equal(b4[0].code, 'RATING_4_5');
    console.log('  ✔ Awarded RATING_4_5 badge when rating >= 4.5 and ratingCount >= 10');

    // 5. Provider rating badge not earned if count < 10
    const tx5 = createMockTx({ provider: { ratingAvg: 5.0, ratingCount: 8 } });
    const b5 = await awardBadges(tx5, { providerId: 5 }, 'RATING');
    assert.equal(b5.length, 0);
    console.log('  ✔ RATING_4_5 badge withheld if reviews count < 10');

    console.log('\n✔ All A4 badge tests passed successfully!\n');
}

testBadges().catch((err) => {
    console.error(err);
    process.exit(1);
});
