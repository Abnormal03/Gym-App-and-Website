/** A2 check: /admin/providers.   Run: node scripts/a2/test-providers.js */
const { createSuite, admin, loginProvider, expect, uniq, assert } = require('../_lib/testkit');
const { adminContext } = require('../_lib/adminContext');

const suite = createSuite('A2 · provider accounts (trainer / physiotherapist)');
let c;
const made = [];
let p1;
let p1Email;

suite.before(async () => {
    c = await adminContext();
});

suite.test('no token -> 401', async () => {
    expect(await admin('GET', '/providers'), 401);
});

suite.test('create TRAINER with sharePercent 70 -> 201, defaults filled, no hash', async () => {
    p1Email = `${uniq('trainer')}@gym.test`;
    const r = expect(await admin('POST', '/providers', { token: c.token, body: { gymId: c.gym1, type: 'TRAINER', name: 'Check Trainer', email: p1Email, sharePercent: 70, specializations: ['Strength'] } }), 201);
    p1 = r.data;
    made.push(p1.id);
    assert.equal(p1.type, 'TRAINER');
    assert.equal(p1.sharePercent, 70);
    assert.equal(p1.gymId, c.gym1);
    assert.equal(p1.experienceYears, 0);
    assert.deepEqual(p1.certifications, []);
    assert.ok(p1.temporaryPassword);
    assert.equal(p1.password, undefined);
});

suite.test('the trainer can log in; token role is TRAINER; must change password', async () => {
    const l = expect(await loginProvider(p1Email, p1.temporaryPassword), 200);
    assert.equal(l.data.user.role, 'TRAINER');
    assert.equal(l.data.mustChangePassword, true);
});

suite.test('create PHYSIOTHERAPIST works', async () => {
    const r = expect(await admin('POST', '/providers', { token: c.token, body: { gymId: c.gym1, type: 'PHYSIOTHERAPIST', name: 'Check Physio', email: `${uniq('physio')}@gym.test` } }), 201);
    made.push(r.data.id);
    assert.equal(r.data.type, 'PHYSIOTHERAPIST');
    assert.equal(r.data.sharePercent, 100);
});

suite.test('NUTRITION_CONSULTANT cannot be created here -> 400', async () => {
    expect(await admin('POST', '/providers', { token: c.token, body: { gymId: c.gym1, type: 'NUTRITION_CONSULTANT', name: 'Not Allowed', email: `${uniq('nc')}@gym.test` } }), 400, 'VALIDATION');
});

suite.test('duplicate email -> 409; foreign gym -> 403; sharePercent 150 -> 400; unknown field -> 400', async () => {
    expect(await admin('POST', '/providers', { token: c.token, body: { gymId: c.gym1, type: 'TRAINER', name: 'Dup Trainer', email: p1Email } }), 409);
    expect(await admin('POST', '/providers', { token: c.token, body: { gymId: c.otherGym, type: 'TRAINER', name: 'Foreign One', email: `${uniq('f')}@gym.test` } }), 403);
    expect(await admin('POST', '/providers', { token: c.token, body: { gymId: c.gym1, type: 'TRAINER', name: 'Too Much', email: `${uniq('g')}@gym.test`, sharePercent: 150 } }), 400);
    expect(await admin('POST', '/providers', { token: c.token, body: { gymId: c.gym1, type: 'TRAINER', name: 'Extra Field', email: `${uniq('h')}@gym.test`, ratingAvg: 5 } }), 400);
});

suite.test('get detail includes availability + packages; other admin -> 403', async () => {
    const r = expect(await admin('GET', `/providers/${p1.id}`, { token: c.token }), 200).data;
    assert.ok(Array.isArray(r.availability));
    assert.ok(Array.isArray(r.packages));
    expect(await admin('GET', `/providers/${p1.id}`, { token: c.otherToken }), 403);
    expect(await admin('GET', '/providers/99999999', { token: c.token }), 404);
});

suite.test('consultants are never an admin\'s to manage (not listed, detail -> 403)', async () => {
    const meron = await c.prisma.provider.findUnique({ where: { email: 'meron.nutrition@gym.test' } });
    if (!meron) throw new Error('seeded consultant meron.nutrition@gym.test not found (run npm run seed:v2)');
    expect(await admin('GET', `/providers/${meron.id}`, { token: c.token }), 403);
    const list = expect(await admin('GET', '/providers?limit=100', { token: c.token })).data;
    assert.ok(!list.items.some((x) => x.id === meron.id));
});

suite.test('list filters (type, isActive, gymId) and pagination', async () => {
    const trainers = expect(await admin('GET', '/providers?type=TRAINER&limit=100', { token: c.token })).data;
    assert.ok(trainers.items.length >= 1 && trainers.items.every((x) => x.type === 'TRAINER'));
    const one = expect(await admin('GET', '/providers?limit=1', { token: c.token })).data;
    assert.equal(one.items.length, 1);
    expect(await admin('GET', `/providers?gymId=${c.otherGym}`, { token: c.token }), 403);
});

suite.test('update: sharePercent works; type/email/gymId/password are rejected', async () => {
    const r = expect(await admin('PATCH', `/providers/${p1.id}`, { token: c.token, body: { sharePercent: 80, bio: 'Updated bio' } }), 200).data;
    assert.equal(r.sharePercent, 80);
    assert.equal(r.bio, 'Updated bio');
    for (const bad of [{ type: 'PHYSIOTHERAPIST' }, { email: 'new@gym.test' }, { gymId: c.gym1 }, { password: 'Hacked123' }, {}]) {
        expect(await admin('PATCH', `/providers/${p1.id}`, { token: c.token, body: bad }), 400);
    }
    expect(await admin('PATCH', `/providers/${p1.id}`, { token: c.otherToken, body: { sharePercent: 1 } }), 403);
});

suite.test('deactivate: provider can no longer log in; reactivate restores login', async () => {
    const r = expect(await admin('PATCH', `/providers/${p1.id}`, { token: c.token, body: { isActive: false } }), 200).data;
    assert.equal(r.isActive, false);
    const blocked = await loginProvider(p1Email, p1.temporaryPassword);
    assert.equal(blocked.status, 403, `deactivated login should be 403, got ${blocked.status}`);
    const list = expect(await admin('GET', '/providers?isActive=false&limit=100', { token: c.token })).data;
    assert.ok(list.items.some((x) => x.id === p1.id));
    assert.equal((await admin('PATCH', `/providers/${p1.id}`, { token: c.token, body: { isActive: true } })).status, 200);
    expect(await loginProvider(p1Email, p1.temporaryPassword), 200);
});

suite.test('reset password: old stops, new works; other admin -> 403', async () => {
    const r = expect(await admin('POST', `/providers/${p1.id}/reset-password`, { token: c.token }), 200).data;
    expect(await loginProvider(p1Email, p1.temporaryPassword), 401);
    expect(await loginProvider(p1Email, r.temporaryPassword), 200);
    expect(await admin('POST', `/providers/${p1.id}/reset-password`, { token: c.otherToken }), 403);
});

suite.run(async () => {
    if (!c) return; // setup failed, nothing to clean
    if (made.length) await c.prisma.provider.deleteMany({ where: { id: { in: made } } });
    await c.cleanup();
});