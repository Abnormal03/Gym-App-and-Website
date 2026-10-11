/**
 * Checks the A1 services against a tiny in-memory fake of the Prisma transaction client. No database needed.
 *   node check-a1-services.js
 */
const assert = require('node:assert/strict');
const { creditSessionEarning, creditConsultationEarning } = require('../services/earning.service');
const { ensureChatThread } = require('../services/chatThread.service');
const { awardBadges } = require('../services/badge.service');
const { toCents } = require('../utils/money');

function makeTx({ sessions = [], items = [], providers = [] } = {}) {
    const earnings = [];
    const threads = [];
    let nextId = 1;
    const tx = {
        earnings,
        threads,
        earning: {
            findUnique: async ({ where }) => earnings.find((e) => e.sessionId === where.sessionId) || null,
            findFirst: async ({ where }) =>
                earnings.find((e) => e.orderItemId === where.orderItemId && e.sessionId === where.sessionId) || null,
            count: async ({ where }) =>
                earnings.filter((e) => e.orderItemId === where.orderItemId && e.sessionId !== null).length,
            create: async ({ data }) => {
                const row = { id: nextId++, ...data };
                earnings.push(row);
                return row;
            },
        },
        trainingSession: { findUnique: async ({ where }) => sessions.find((s) => s.id === where.id) || null },
        orderItem: { findUnique: async ({ where }) => items.find((i) => i.id === where.id) || null },
        provider: { findUnique: async ({ where }) => providers.find((p) => p.id === where.id) || null },
        chatThread: {
            upsert: async ({ where, create }) => {
                const key = where.userId_providerId;
                let t = threads.find((x) => x.userId === key.userId && x.providerId === key.providerId);
                if (!t) {
                    t = { id: threads.length + 1, ...create };
                    threads.push(t);
                }
                return t;
            },
        },
    };
    return tx;
}

(async () => {
    // ---- session earnings: 1000 ETB package, 3 sessions, provider keeps 70% -> 700 split exactly ----
    const provider = { id: 7, gymId: 1, sharePercent: 70 };
    const purchase = { orderItemId: 50, pricePaid: '1000.00', sessionsTotal: 3 };
    const sessions = [1, 2, 3].map((id) => ({ id, status: 'COMPLETED', purchase, provider }));
    const tx = makeTx({ sessions });

    const e1 = await creditSessionEarning(tx, 1);
    const again = await creditSessionEarning(tx, 1); // idempotent
    assert.equal(again.id, e1.id);
    assert.equal(tx.earnings.length, 1);
    await creditSessionEarning(tx, 2);
    await creditSessionEarning(tx, 3);
    assert.equal(tx.earnings.length, 3);
    assert.equal(tx.earnings.reduce((s, e) => s + toCents(e.amount), 0), 70000); // exactly 700.00
    assert.equal(tx.earnings[0].gymId, 1);
    assert.equal(tx.earnings[0].status, 'AVAILABLE');
    assert.equal(tx.earnings[2].amount, 233.34); // the last one carries the remainder

    // a 4th credit for a 3-session package is refused
    const tx2 = makeTx({ sessions: [{ id: 9, status: 'COMPLETED', purchase, provider }] });
    for (let i = 0; i < 3; i++) tx2.earnings.push({ orderItemId: 50, sessionId: 100 + i });
    await assert.rejects(() => creditSessionEarning(tx2, 9), /already credited/);

    // not completed -> refused
    const tx3 = makeTx({ sessions: [{ id: 5, status: 'SCHEDULED', purchase, provider }] });
    await assert.rejects(() => creditSessionEarning(tx3, 5), /completed/);

    // ---- consultation earning: 500 ETB, consultant keeps 80% -> 400, paid by the ORDER's gym ----
    const tx4 = makeTx({
        items: [{ id: 60, type: 'CONSULTATION', amount: '500.00', order: { gymId: 2 } }],
        providers: [{ id: 8, type: 'NUTRITION_CONSULTANT', sharePercent: 80 }, { id: 9, type: 'TRAINER', sharePercent: 100 }],
    });
    const c1 = await creditConsultationEarning(tx4, 60, 8);
    assert.equal(c1.amount, 400);
    assert.equal(c1.gymId, 2);
    assert.equal(c1.sessionId, null);
    const c2 = await creditConsultationEarning(tx4, 60, 8); // idempotent
    assert.equal(c2.id, c1.id);
    assert.equal(tx4.earnings.length, 1);
    await assert.rejects(() => creditConsultationEarning(tx4, 60, 9), /another consultant/i); // already credited to 8
    const tx4b = makeTx({
        items: [{ id: 61, type: 'CONSULTATION', amount: '500.00', order: { gymId: 2 } }],
        providers: [{ id: 9, type: 'TRAINER', sharePercent: 100 }],
    });
    await assert.rejects(() => creditConsultationEarning(tx4b, 61, 9), /not a consultant/i);

    // ---- chat thread: find-or-create ----
    const tx5 = makeTx();
    const t1 = await ensureChatThread(tx5, 3, 8);
    const t2 = await ensureChatThread(tx5, 3, 8);
    const t3 = await ensureChatThread(tx5, 4, 8);
    assert.equal(t1.id, t2.id);
    assert.notEqual(t1.id, t3.id);
    assert.equal(tx5.threads.length, 2);

    // ---- badge stub ----
    assert.deepEqual(await awardBadges(tx5, { userId: 3 }, 'CHECK_IN'), []);

    console.log('A1 services checks passed');
})().catch((e) => {
    console.error('FAILED:', e.message);
    process.exit(1);
});