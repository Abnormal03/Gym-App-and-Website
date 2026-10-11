/** A3 check: GET/PUT /me/provider.   Run: node scripts/a3/test-profile.js */
const { createSuite, http, loginProvider, loginStaff, expect, assert } = require('../_lib/testkit');

const suite = createSuite('A3 · provider profile (E-40)');
let sara; // { token, id }
let consultant;
let staffToken;
let original; // profile to restore at the end

suite.before(async () => {
    const s = await loginProvider('sara.bole@gym.test');
    assert.equal(s.status, 200, 'seeded trainer sara.bole@gym.test cannot log in (run npm run seed:v2)');
    sara = { token: s.token, id: s.data.user.id };
    const m = await loginProvider('meron.nutrition@gym.test');
    consultant = { token: m.token };
    staffToken = (await loginStaff('staff.bole@gym.test')).token;
    original = (await http('GET', '/me/provider', { token: sara.token })).data;
});

suite.test('no token -> 401; staff token -> 403', async () => {
    expect(await http('GET', '/me/provider'), 401);
    if (staffToken) expect(await http('GET', '/me/provider', { token: staffToken }), 403);
});

suite.test('GET returns my profile with my gym, no password, sharePercent visible', async () => {
    const r = expect(await http('GET', '/me/provider', { token: sara.token }), 200).data;
    assert.equal(r.id, sara.id);
    assert.equal(r.type, 'TRAINER');
    assert.ok(r.gym && r.gym.name);
    assert.equal(typeof r.sharePercent, 'number');
    assert.equal(r.password, undefined);
});

suite.test('PUT updates only the fields I send', async () => {
    const r = expect(await http('PUT', '/me/provider', { token: sara.token, body: { bio: 'A3 check bio', specializations: ['Strength', 'Mobility'], experienceYears: 7 } }), 200).data;
    assert.equal(r.bio, 'A3 check bio');
    assert.deepEqual(r.specializations, ['Strength', 'Mobility']);
    assert.equal(r.experienceYears, 7);
    assert.equal(r.name, original.name); // untouched
    const again = expect(await http('GET', '/me/provider', { token: sara.token }), 200).data;
    assert.equal(again.bio, 'A3 check bio'); // really saved
});

suite.test('can clear bio/phone/photo with null; photoUrl must be a URL', async () => {
    const r = expect(await http('PUT', '/me/provider', { token: sara.token, body: { bio: null, phone: null, photoUrl: null } }), 200).data;
    assert.equal(r.bio, null);
    expect(await http('PUT', '/me/provider', { token: sara.token, body: { photoUrl: 'not a url' } }), 400);
    const ok = expect(await http('PUT', '/me/provider', { token: sara.token, body: { photoUrl: 'https://example.com/me.jpg' } }), 200).data;
    assert.equal(ok.photoUrl, 'https://example.com/me.jpg');
});

suite.test('fields I must not change are rejected (type, gymId, sharePercent, email, isActive, password, ratings)', async () => {
    for (const bad of [{ type: 'PHYSIOTHERAPIST' }, { gymId: 2 }, { sharePercent: 100 }, { email: 'x@gym.test' }, { isActive: false }, { password: 'Hacked123' }, { ratingAvg: 5 }]) {
        expect(await http('PUT', '/me/provider', { token: sara.token, body: bad }), 400, 'VALIDATION');
    }
});

suite.test('empty body, negative experience, too many specializations -> 400', async () => {
    expect(await http('PUT', '/me/provider', { token: sara.token, body: {} }), 400);
    expect(await http('PUT', '/me/provider', { token: sara.token, body: { experienceYears: -1 } }), 400);
    expect(await http('PUT', '/me/provider', { token: sara.token, body: { specializations: Array.from({ length: 16 }, (_, i) => `s${i}`) } }), 400);
});

suite.test('a consultant can read and edit their profile too (no gym)', async () => {
    if (!consultant.token) return;
    const r = expect(await http('GET', '/me/provider', { token: consultant.token }), 200).data;
    assert.equal(r.type, 'NUTRITION_CONSULTANT');
    assert.equal(r.gym, null);
});

suite.run(async () => {
    // put the seeded values back
    await http('PUT', '/me/provider', {
        token: sara.token,
        body: {
            name: original.name, phone: original.phone, bio: original.bio, photoUrl: original.photoUrl,
            specializations: original.specializations, experienceYears: original.experienceYears, certifications: original.certifications,
        },
    });
});