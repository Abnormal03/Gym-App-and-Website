/** A2 check: /admin/gym-packages.   Run: node scripts/a2/test-gym-packages.js */
const { createSuite, admin, expect, uniq, assert } = require('../_lib/testkit');
const { adminContext } = require('../_lib/adminContext');

const suite = createSuite('A2 · gym packages (with V2 restrictions)');
let c;
const made = [];
let k1;

suite.before(async () => {
    c = await adminContext();
});

suite.test('no token -> 401; staff token -> 403', async () => {
    expect(await admin('GET', '/gym-packages'), 401);
    if (c.staffToken) expect(await admin('GET', '/gym-packages', { token: c.staffToken }), 403);
});

suite.test('create restricted package: days/periods de-duplicated + sorted, price rounded, defaults filled', async () => {
    const r = expect(await admin('POST', '/gym-packages', {
        token: c.token, body: {
            gymId: c.gym1, name: uniq('Weekday Mornings'), type: 'monthly', price: 1800.456, durationDays: 30,
            maxVisits: 20, allowedDays: [5, 1, 1, 3], allowedPeriods: ['MORNING', 'MORNING'],
        }
    }), 201);
    k1 = r.data;
    made.push(k1.id);
    assert.deepEqual(k1.allowedDays, [1, 3, 5]);
    assert.deepEqual(k1.allowedPeriods, ['MORNING']);
    assert.equal(k1.price, 1800.46);
    assert.equal(k1.maxVisits, 20);
    assert.equal(k1.maxGroupSize, 1); // default
    assert.equal(k1.isActive, true);
});

suite.test('create unrestricted daily pass for groups: maxVisits null, days/periods empty', async () => {
    const r = expect(await admin('POST', '/gym-packages', { token: c.token, body: { gymId: c.gym1, name: uniq('Daily'), type: 'daily', price: 150, durationDays: 1, maxGroupSize: 5 } }), 201).data;
    made.push(r.id);
    assert.equal(r.maxVisits, null);
    assert.deepEqual(r.allowedDays, []);
    assert.deepEqual(r.allowedPeriods, []);
    assert.equal(r.maxGroupSize, 5);
});

suite.test('bad input -> 400 (day 7, unknown type, negative price, zero group size, unknown field)', async () => {
    const base = { gymId: c.gym1, name: 'Bad Package', type: 'monthly', price: 100, durationDays: 30 };
    expect(await admin('POST', '/gym-packages', { token: c.token, body: { ...base, allowedDays: [7] } }), 400);
    expect(await admin('POST', '/gym-packages', { token: c.token, body: { ...base, type: 'weekly2' } }), 400);
    expect(await admin('POST', '/gym-packages', { token: c.token, body: { ...base, price: -5 } }), 400);
    expect(await admin('POST', '/gym-packages', { token: c.token, body: { ...base, maxGroupSize: 0 } }), 400);
    expect(await admin('POST', '/gym-packages', { token: c.token, body: { ...base, isActive: false } }), 400);
});

suite.test("a gym that is not yours -> 403; another admin's package -> 403", async () => {
    expect(await admin('POST', '/gym-packages', { token: c.token, body: { gymId: c.otherGym, name: 'Theirs Now', type: 'daily', price: 100, durationDays: 1 } }), 403);
    expect(await admin('GET', `/gym-packages/${k1.id}`, { token: c.otherToken }), 403);
    expect(await admin('PATCH', `/gym-packages/${k1.id}`, { token: c.otherToken, body: { price: 1 } }), 403);
    expect(await admin('DELETE', `/gym-packages/${k1.id}`, { token: c.otherToken }), 403);
});

suite.test('get / list / filters / pagination', async () => {
    expect(await admin('GET', `/gym-packages/${k1.id}`, { token: c.token }), 200);
    expect(await admin('GET', '/gym-packages/99999999', { token: c.token }), 404);
    expect(await admin('GET', '/gym-packages/abc', { token: c.token }), 400);
    const all = expect(await admin('GET', `/gym-packages?gymId=${c.gym1}&limit=100`, { token: c.token })).data;
    assert.ok(all.items.some((x) => x.id === k1.id));
    const one = expect(await admin('GET', '/gym-packages?limit=1', { token: c.token })).data;
    assert.equal(one.items.length, 1);
    expect(await admin('GET', `/gym-packages?gymId=${c.otherGym}`, { token: c.token }), 403);
    const theirs = expect(await admin('GET', '/gym-packages?limit=100', { token: c.otherToken })).data;
    assert.ok(!theirs.items.some((x) => x.id === k1.id));
});

suite.test('update: price + clearing restrictions (null / []) works; gymId and unknown fields rejected', async () => {
    const r = expect(await admin('PATCH', `/gym-packages/${k1.id}`, { token: c.token, body: { price: 2000, maxVisits: null, allowedPeriods: [] } }), 200).data;
    assert.equal(r.price, 2000);
    assert.equal(r.maxVisits, null);
    assert.deepEqual(r.allowedPeriods, []);
    expect(await admin('PATCH', `/gym-packages/${k1.id}`, { token: c.token, body: { gymId: c.gym1 } }), 400);
    expect(await admin('PATCH', `/gym-packages/${k1.id}`, { token: c.token, body: {} }), 400);
});

suite.test('DELETE = deactivate (soft): isActive false, still readable, filter works, reactivate works', async () => {
    const r = expect(await admin('DELETE', `/gym-packages/${k1.id}`, { token: c.token }), 200).data;
    assert.equal(r.isActive, false);
    expect(await admin('GET', `/gym-packages/${k1.id}`, { token: c.token }), 200);
    const off = expect(await admin('GET', '/gym-packages?isActive=false&limit=100', { token: c.token })).data;
    assert.ok(off.items.some((x) => x.id === k1.id));
    const on = expect(await admin('PATCH', `/gym-packages/${k1.id}`, { token: c.token, body: { isActive: true } }), 200).data;
    assert.equal(on.isActive, true);
});

suite.run(async () => {
    if (!c) return; // setup failed, nothing to clean
    if (made.length) await c.prisma.package.deleteMany({ where: { id: { in: made } } });
    await c.cleanup();
});