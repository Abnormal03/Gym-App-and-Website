/** A3 check: /me/packages.   Run: node scripts/a3/test-packages.js */
const { createSuite, http, loginProvider, expect, uniq, getPrisma, assert } = require('../_lib/testkit');

const suite = createSuite('A3 · provider packages (E-42)');
let sara;
let dawit;
let consultantToken;
const made = [];
let pk;

suite.before(async () => {
    const s = await loginProvider('sara.bole@gym.test');
    assert.equal(s.status, 200, 'seeded trainer sara.bole@gym.test cannot log in (run npm run seed:v2)');
    sara = s.token;
    dawit = (await loginProvider('dawit.bole@gym.test')).token;
    consultantToken = (await loginProvider('meron.nutrition@gym.test')).token;
});

suite.test('no token -> 401; consultant -> 403', async () => {
    expect(await http('GET', '/me/packages'), 401);
    if (consultantToken) expect(await http('GET', '/me/packages', { token: consultantToken }), 403);
});

suite.test('create -> 201 with price rounded; validity set by the provider', async () => {
    const r = expect(await http('POST', '/me/packages', { token: sara, body: { name: uniq('A3 Pack'), sessionCount: 6, price: 1999.999, validityDays: 45, description: 'check' } }), 201).data;
    pk = r;
    made.push(pk.id);
    assert.equal(pk.sessionCount, 6);
    assert.equal(pk.price, 2000);
    assert.equal(pk.validityDays, 45);
    assert.equal(pk.isActive, true);
});

suite.test('bad input -> 400 (0 sessions, negative price, 0 days, unknown field, missing name)', async () => {
    const base = { name: 'Bad Pack', sessionCount: 4, price: 100, validityDays: 30 };
    for (const bad of [{ sessionCount: 0 }, { price: -1 }, { validityDays: 0 }, { validityDays: 400 }, { providerId: 2 }, { name: 'x' }, { sessionCount: 1.5 }]) {
        expect(await http('POST', '/me/packages', { token: sara, body: { ...base, ...bad } }), 400, 'VALIDATION');
    }
});

suite.test('list shows mine (with isActive filter + pagination), never another provider\'s', async () => {
    const mine = expect(await http('GET', '/me/packages?limit=100', { token: sara }), 200).data;
    assert.ok(mine.items.some((x) => x.id === pk.id));
    const dawits = expect(await http('GET', '/me/packages?limit=100', { token: dawit }), 200).data;
    assert.ok(!dawits.items.some((x) => x.id === pk.id));
    const one = expect(await http('GET', '/me/packages?limit=1', { token: sara }), 200).data;
    assert.equal(one.items.length, 1);
    const inactive = expect(await http('GET', '/me/packages?isActive=false&limit=100', { token: sara }), 200).data;
    assert.ok(!inactive.items.some((x) => x.id === pk.id));
});

suite.test('get mine 200; unknown 404; bad id 400; another provider\'s -> 403', async () => {
    expect(await http('GET', `/me/packages/${pk.id}`, { token: sara }), 200);
    expect(await http('GET', '/me/packages/99999999', { token: sara }), 404);
    expect(await http('GET', '/me/packages/abc', { token: sara }), 400);
    expect(await http('GET', `/me/packages/${pk.id}`, { token: dawit }), 403, 'FORBIDDEN');
});

suite.test('update mine; another provider cannot update or delete it; bad fields rejected', async () => {
    const r = expect(await http('PATCH', `/me/packages/${pk.id}`, { token: sara, body: { name: uniq('A3 Renamed'), price: 2500, sessionCount: 8, validityDays: 60 } }), 200).data;
    assert.equal(r.price, 2500);
    assert.equal(r.sessionCount, 8);
    assert.equal(r.validityDays, 60);
    expect(await http('PATCH', `/me/packages/${pk.id}`, { token: dawit, body: { price: 1 } }), 403);
    expect(await http('DELETE', `/me/packages/${pk.id}`, { token: dawit }), 403);
    expect(await http('PATCH', `/me/packages/${pk.id}`, { token: sara, body: { providerId: 2 } }), 400);
    expect(await http('PATCH', `/me/packages/${pk.id}`, { token: sara, body: {} }), 400);
});

suite.test('DELETE = deactivate (soft): still readable, listed under isActive=false, can be re-activated', async () => {
    const r = expect(await http('DELETE', `/me/packages/${pk.id}`, { token: sara }), 200).data;
    assert.equal(r.isActive, false);
    expect(await http('GET', `/me/packages/${pk.id}`, { token: sara }), 200);
    const off = expect(await http('GET', '/me/packages?isActive=false&limit=100', { token: sara }), 200).data;
    assert.ok(off.items.some((x) => x.id === pk.id));
    const on = expect(await http('PATCH', `/me/packages/${pk.id}`, { token: sara, body: { isActive: true } }), 200).data;
    assert.equal(on.isActive, true);
});

suite.run(async () => {
    const prisma = getPrisma();
    if (!made.length) return;
    if (prisma) await prisma.providerPackage.deleteMany({ where: { id: { in: made } } });
    else for (const id of made) await http('DELETE', `/me/packages/${id}`, { token: sara }); // at least deactivate
});