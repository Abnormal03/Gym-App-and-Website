/**
 * A3 check: GET /me/clients.   Run: node scripts/a3/test-clients.js
 * Builds fixtures with Prisma (bookings, orders, purchases, sessions, consultations), checks the API, then deletes them.
 */
const { createSuite, http, loginProvider, expect, getPrisma, assert } = require('../_lib/testkit');

const suite = createSuite('A3 · my clients (E-44)');
const day = 86_400_000;
const hour = 3_600_000;

let prisma;
let sara;
let dawit;
let meron;
let member;
let gymId;
let gymName;
const ids = { booking: [], order: [], item: [], purchase: [], session: [], consult: [], pkg: [] };
const f = {}; // fixture ids

/** booking -> order -> orderItem chain (every order needs its own booking) */
async function chain(type, extra = {}) {
    const start = new Date(Date.now() + 3 * day);
    const booking = await prisma.booking.create({ data: { userId: member.id, gymId, slotStart: start, slotEnd: new Date(start.getTime() + 2 * hour), status: 'confirmed' } });
    const order = await prisma.order.create({ data: { userId: member.id, gymId, bookingId: booking.id, totalAmount: 100 } });
    const item = await prisma.orderItem.create({ data: { orderId: order.id, type, label: `A3 fixture ${type}`, amount: 100, ...extra } });
    ids.booking.push(booking.id); ids.order.push(order.id); ids.item.push(item.id);
    return { booking, order, item };
}

suite.before(async () => {
    prisma = getPrisma();
    if (!prisma) throw new Error('Needs Prisma (config/prisma.js) to build fixtures.');
    const s = await loginProvider('sara.bole@gym.test');
    assert.equal(s.status, 200, 'seeded trainer sara.bole@gym.test cannot log in (run npm run seed:v2)');
    sara = { token: s.token, id: s.data.user.id };
    gymId = s.data.user.gymId;
    const d = await loginProvider('dawit.bole@gym.test');
    dawit = { token: d.token, id: d.data.user.id };
    const m = await loginProvider('meron.nutrition@gym.test');
    meron = { token: m.token, id: m.data.user.id };
    member = await prisma.user.findUnique({ where: { email: 'member@gym.test' } });
    if (!member) throw new Error('seeded member member@gym.test not found (run npm run seed:v2)');
    gymName = (await prisma.gym.findUnique({ where: { id: gymId } })).name;

    const pkg = await prisma.providerPackage.create({ data: { providerId: sara.id, name: 'A3 Fixture Package', sessionCount: 4, price: 1200, validityDays: 30 } });
    ids.pkg.push(pkg.id);

    const mkPurchase = async (status, expiresAt, used) => {
        const { booking, item } = await chain('PROVIDER_PACKAGE', { providerId: sara.id, providerPackageId: pkg.id });
        const p = await prisma.providerPackagePurchase.create({
            data: {
                userId: member.id, providerId: sara.id, providerPackageId: pkg.id, orderItemId: item.id,
                packageName: 'A3 Fixture Package', sessionsTotal: 4, pricePaid: 1200, sessionsUsed: used, expiresAt, status,
            }
        });
        ids.purchase.push(p.id);
        return { p, booking };
    };

    // 1) ACTIVE and valid: 4 total, 1 used, 1 scheduled in the future  -> sessionsLeft must be 2
    const active = await mkPurchase('ACTIVE', new Date(Date.now() + 20 * day), 1);
    f.active = active.p.id;
    const start = new Date(Date.now() + 2 * day);
    const session = await prisma.trainingSession.create({
        data: {
            purchaseId: active.p.id, bookingId: active.booking.id, providerId: sara.id, userId: member.id,
            startsAt: start, endsAt: new Date(start.getTime() + hour), status: 'SCHEDULED',
        }
    });
    ids.session.push(session.id);
    f.nextSessionAt = start.getTime();
    // 2) ACTIVE status but already past its expiry date -> must NOT be listed (status is flipped lazily)
    f.expired = (await mkPurchase('ACTIVE', new Date(Date.now() - day), 0)).p.id;
    // 3) not paid yet -> must NOT be listed
    f.pending = (await mkPurchase('PENDING', new Date(Date.now() + 20 * day), 0)).p.id;

    // consultations for Meron
    const mkConsult = async (status, expiresAt) => {
        const { item } = await chain('CONSULTATION');
        const c = await prisma.consultationAccess.create({ data: { userId: member.id, orderItemId: item.id, consultantId: meron.id, status, startsAt: new Date(Date.now() - day), expiresAt } });
        ids.consult.push(c.id);
        return c.id;
    };
    f.consultActive = await mkConsult('ACTIVE', new Date(Date.now() + 10 * day));
    f.consultExpired = await mkConsult('ACTIVE', new Date(Date.now() - day));
});

suite.test('no token -> 401', async () => {
    expect(await http('GET', '/me/clients'), 401);
});

suite.test('trainer sees the ACTIVE purchase with correct numbers, sessionsLeft = total - used - booked', async () => {
    const r = expect(await http('GET', '/me/clients?limit=100', { token: sara.token }), 200).data;
    const row = r.items.find((x) => x.purchaseId === f.active);
    assert.ok(row, 'active purchase not listed');
    assert.equal(row.kind, 'PACKAGE');
    assert.equal(row.userId, member.id);
    assert.equal(row.name, member.name);
    assert.equal(row.sessionsTotal, 4);
    assert.equal(row.sessionsUsed, 1);
    assert.equal(row.sessionsLeft, 2); // 4 - 1 used - 1 already booked
    assert.equal(new Date(row.nextSessionAt).getTime(), f.nextSessionAt);
    assert.ok(new Date(row.expiresAt).getTime() > Date.now());
});

suite.test('expired (by date) and unpaid (PENDING) purchases are NOT listed', async () => {
    const r = expect(await http('GET', '/me/clients?limit=100', { token: sara.token }), 200).data;
    assert.ok(!r.items.some((x) => x.purchaseId === f.expired));
    assert.ok(!r.items.some((x) => x.purchaseId === f.pending));
});

suite.test('contact details are never exposed (no email, phone or password)', async () => {
    const r = expect(await http('GET', '/me/clients?limit=100', { token: sara.token }), 200).data;
    for (const x of r.items) {
        assert.equal(x.email, undefined);
        assert.equal(x.phone, undefined);
        assert.equal(x.password, undefined);
    }
});

suite.test('another trainer does not see my clients', async () => {
    const r = expect(await http('GET', '/me/clients?limit=100', { token: dawit.token }), 200).data;
    assert.ok(!r.items.some((x) => x.purchaseId === f.active));
});

suite.test('pagination works', async () => {
    const r = expect(await http('GET', '/me/clients?limit=1', { token: sara.token }), 200).data;
    assert.equal(r.items.length, 1);
    assert.equal(r.limit, 1);
    assert.ok(r.total >= 1);
});

suite.test('consultant sees the active consultation with the gym of the order; expired one is hidden', async () => {
    const r = expect(await http('GET', '/me/clients?limit=100', { token: meron.token }), 200).data;
    const row = r.items.find((x) => x.consultationId === f.consultActive);
    assert.ok(row, 'active consultation not listed');
    assert.equal(row.kind, 'CONSULTATION');
    assert.equal(row.userId, member.id);
    assert.equal(row.gymId, gymId);
    assert.equal(row.gymName, gymName);
    assert.ok(!r.items.some((x) => x.consultationId === f.consultExpired));
    assert.ok(!r.items.some((x) => x.kind === 'PACKAGE')); // a consultant never gets package rows
});

suite.run(async () => {
    // delete in dependency order
    await prisma.trainingSession.deleteMany({ where: { id: { in: ids.session } } });
    await prisma.providerPackagePurchase.deleteMany({ where: { id: { in: ids.purchase } } });
    await prisma.consultationAccess.deleteMany({ where: { id: { in: ids.consult } } });
    await prisma.orderItem.deleteMany({ where: { id: { in: ids.item } } });
    await prisma.order.deleteMany({ where: { id: { in: ids.order } } });
    await prisma.booking.deleteMany({ where: { id: { in: ids.booking } } });
    await prisma.providerPackage.deleteMany({ where: { id: { in: ids.pkg } } });
});