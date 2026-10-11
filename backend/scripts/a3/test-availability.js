/** A3 check: GET/PUT /me/availability.   Run: node scripts/a3/test-availability.js */
const { createSuite, http, loginProvider, expect, assert } = require('../_lib/testkit');

const suite = createSuite('A3 · weekly availability (E-41)');
let token;
let consultantToken;
let original; // slots to restore

const slotsOf = (r) => r.data.slots;
const key = (s) => `${s.dayOfWeek}-${s.period}`;

suite.before(async () => {
    const s = await loginProvider('sara.bole@gym.test');
    assert.equal(s.status, 200, 'seeded trainer sara.bole@gym.test cannot log in (run npm run seed:v2)');
    token = s.token;
    consultantToken = (await loginProvider('meron.nutrition@gym.test')).token;
    original = slotsOf(await http('GET', '/me/availability', { token }));
});

suite.test('no token -> 401; consultant -> 403 (consultants have no availability)', async () => {
    expect(await http('GET', '/me/availability'), 401);
    if (consultantToken) {
        expect(await http('GET', '/me/availability', { token: consultantToken }), 403);
        expect(await http('PUT', '/me/availability', { token: consultantToken, body: { slots: [] } }), 403);
    }
});

suite.test('GET returns slots sorted by day then period', async () => {
    const slots = slotsOf(expect(await http('GET', '/me/availability', { token }), 200));
    assert.ok(Array.isArray(slots));
    const order = { MORNING: 0, AFTERNOON: 1, EVENING: 2 };
    for (let i = 1; i < slots.length; i++) {
        const a = slots[i - 1];
        const b = slots[i];
        assert.ok(a.dayOfWeek < b.dayOfWeek || (a.dayOfWeek === b.dayOfWeek && order[a.period] <= order[b.period]), 'not sorted');
    }
});

suite.test('PUT replaces the whole set (old slots disappear)', async () => {
    const wanted = [{ dayOfWeek: 2, period: 'EVENING' }, { dayOfWeek: 0, period: 'MORNING' }, { dayOfWeek: 0, period: 'AFTERNOON' }];
    const r = slotsOf(expect(await http('PUT', '/me/availability', { token, body: { slots: wanted } }), 200));
    assert.deepEqual(r.map(key), ['0-MORNING', '0-AFTERNOON', '2-EVENING']);
    const again = slotsOf(expect(await http('GET', '/me/availability', { token }), 200));
    assert.deepEqual(again.map(key), ['0-MORNING', '0-AFTERNOON', '2-EVENING']); // really saved
});

suite.test('duplicates are dropped silently', async () => {
    const r = slotsOf(expect(await http('PUT', '/me/availability', {
        token, body: {
            slots: [
                { dayOfWeek: 1, period: 'MORNING' }, { dayOfWeek: 1, period: 'MORNING' }, { dayOfWeek: 1, period: 'MORNING' },
            ]
        }
    }), 200));
    assert.equal(r.length, 1);
});

suite.test('an empty list clears availability (provider is then not bookable)', async () => {
    const r = slotsOf(expect(await http('PUT', '/me/availability', { token, body: { slots: [] } }), 200));
    assert.equal(r.length, 0);
});

suite.test('the full 7x3 grid is accepted', async () => {
    const all = [];
    for (let d = 0; d <= 6; d++) for (const p of ['MORNING', 'AFTERNOON', 'EVENING']) all.push({ dayOfWeek: d, period: p });
    assert.equal(slotsOf(expect(await http('PUT', '/me/availability', { token, body: { slots: all } }), 200)).length, 21);
});

suite.test('invalid input -> 400 and the saved set is NOT changed', async () => {
    const before = slotsOf(await http('GET', '/me/availability', { token })).map(key);
    for (const bad of [
        { slots: [{ dayOfWeek: 7, period: 'MORNING' }] },
        { slots: [{ dayOfWeek: -1, period: 'MORNING' }] },
        { slots: [{ dayOfWeek: 1, period: 'NIGHT' }] },
        { slots: [{ dayOfWeek: 1, period: 'MORNING', extra: true }] },
        { slots: 'MORNING' },
        { slotz: [] },
        {},
    ]) {
        expect(await http('PUT', '/me/availability', { token, body: bad }), 400, 'VALIDATION');
    }
    const after = slotsOf(await http('GET', '/me/availability', { token })).map(key);
    assert.deepEqual(after, before);
});

suite.run(async () => {
    await http('PUT', '/me/availability', { token, body: { slots: original } }); // restore the seeded grid
});