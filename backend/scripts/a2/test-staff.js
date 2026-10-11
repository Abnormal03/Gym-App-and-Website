/** A2 check: /admin/staff.   Run: node scripts/a2/test-staff.js */
const { createSuite, admin, loginStaff, expect, uniq, assert, SKIP } = require('../_lib/testkit');
const { adminContext } = require('../_lib/adminContext');

const suite = createSuite('A2 · staff accounts');
let c; // context
const made = []; // ids to clean up
let s1; // first created staff (generated password)
let s1Email;
let s1Pw; // password after the reset test

suite.before(async () => {
    c = await adminContext();
});

suite.test('no token -> 401, staff token -> 403', async () => {
    expect(await admin('GET', '/staff'), 401);
    if (!c.staffToken) return SKIP;
    expect(await admin('GET', '/staff', { token: c.staffToken }), 403);
});

suite.test('create without password -> 201, temporary password shown once, hash never returned', async () => {
    s1Email = `${uniq('desk')}@gym.test`;
    const r = expect(await admin('POST', '/staff', { token: c.token, body: { gymId: c.gym1, name: 'Check Desk', email: ` ${s1Email.toUpperCase()} ` } }), 201);
    s1 = r.data;
    made.push(s1.id);
    assert.equal(s1.email, s1Email); // trimmed + lowercased
    assert.ok(s1.temporaryPassword && s1.temporaryPassword.length >= 8);
    assert.equal(s1.mustChangePassword, true);
    assert.equal(s1.password, undefined);
    assert.equal(s1.gymId, c.gym1);
});

suite.test('the new staff member can log in and must change the password', async () => {
    const l = expect(await loginStaff(s1Email, s1.temporaryPassword), 200);
    assert.equal(l.data.mustChangePassword, true);
    assert.equal(l.data.user.role, 'GYM_STAFF');
});

suite.test('duplicate email -> 409', async () => {
    expect(await admin('POST', '/staff', { token: c.token, body: { gymId: c.gym1, name: 'Dup', email: s1Email } }), 409, 'ALREADY_EXISTS');
});

suite.test("a gym that is not yours -> 403 (also for the other admin's staff)", async () => {
    expect(await admin('POST', '/staff', { token: c.token, body: { gymId: c.otherGym, name: 'X Staff', email: `${uniq('x')}@gym.test` } }), 403, 'FORBIDDEN');
});

suite.test('bad input -> 400 (unknown field, bad email, short name)', async () => {
    expect(await admin('POST', '/staff', { token: c.token, body: { gymId: c.gym1, name: 'Okay Name', email: `${uniq('y')}@gym.test`, role: 'admin' } }), 400, 'VALIDATION');
    expect(await admin('POST', '/staff', { token: c.token, body: { gymId: c.gym1, name: 'Okay Name', email: 'not-an-email' } }), 400);
    expect(await admin('POST', '/staff', { token: c.token, body: { gymId: c.gym1, name: 'A', email: `${uniq('z')}@gym.test` } }), 400);
    expect(await admin('POST', '/staff', { token: c.token, body: { gymId: c.gym1, name: 'Okay Name', email: `${uniq('w')}@gym.test`, password: 'short' } }), 400);
});

suite.test('admin-chosen password is NOT echoed back and works for login', async () => {
    const email = `${uniq('chosen')}@gym.test`;
    const r = expect(await admin('POST', '/staff', { token: c.token, body: { gymId: c.gym1, name: 'Chosen Pw', email, password: 'Chosen123' } }), 201);
    made.push(r.data.id);
    assert.equal(r.data.temporaryPassword, undefined);
    expect(await loginStaff(email, 'Chosen123'), 200);
});

suite.test('list: contains my staff, pagination works, filters work, foreign gym -> 403', async () => {
    const all = expect(await admin('GET', '/staff?limit=100', { token: c.token })).data;
    assert.ok(all.items.some((x) => x.id === s1.id));
    assert.ok(all.items.every((x) => x.password === undefined));
    const one = expect(await admin('GET', '/staff?limit=1', { token: c.token })).data;
    assert.equal(one.items.length, 1);
    assert.equal(one.limit, 1);
    assert.ok(one.total >= 2);
    const byGym = expect(await admin('GET', `/staff?gymId=${c.gym1}&limit=100`, { token: c.token })).data;
    assert.ok(byGym.items.every((x) => x.gymId === c.gym1));
    expect(await admin('GET', `/staff?gymId=${c.otherGym}`, { token: c.token }), 403);
    const theirs = expect(await admin('GET', '/staff?limit=100', { token: c.otherToken })).data;
    assert.ok(!theirs.items.some((x) => x.id === s1.id)); // the other admin cannot see my staff
});

suite.test('get by id: mine 200, other admin 403, unknown 404, bad id 400', async () => {
    expect(await admin('GET', `/staff/${s1.id}`, { token: c.token }), 200);
    expect(await admin('GET', `/staff/${s1.id}`, { token: c.otherToken }), 403, 'FORBIDDEN');
    expect(await admin('GET', '/staff/99999999', { token: c.token }), 404, 'NOT_FOUND');
    expect(await admin('GET', '/staff/abc', { token: c.token }), 400);
});

suite.test('update: rename works; password/empty body -> 400; foreign gym -> 403; move to my other gym works', async () => {
    const r = expect(await admin('PATCH', `/staff/${s1.id}`, { token: c.token, body: { name: 'Renamed Desk' } }), 200);
    assert.equal(r.data.name, 'Renamed Desk');
    expect(await admin('PATCH', `/staff/${s1.id}`, { token: c.token, body: { password: 'Hacked123' } }), 400);
    expect(await admin('PATCH', `/staff/${s1.id}`, { token: c.token, body: {} }), 400);
    expect(await admin('PATCH', `/staff/${s1.id}`, { token: c.token, body: { gymId: c.otherGym } }), 403);
    expect(await admin('PATCH', `/staff/${s1.id}`, { token: c.otherToken, body: { name: 'Stolen Desk' } }), 403);
    if (c.gym2) {
        const m = expect(await admin('PATCH', `/staff/${s1.id}`, { token: c.token, body: { gymId: c.gym2 } }), 200);
        assert.equal(m.data.gymId, c.gym2);
        assert.equal((await admin('PATCH', `/staff/${s1.id}`, { token: c.token, body: { gymId: c.gym1 } })).status, 200);
    }
});

suite.test('reset password: new one works, old one stops, must change again', async () => {
    const r = expect(await admin('POST', `/staff/${s1.id}/reset-password`, { token: c.token }), 200);
    assert.ok(r.data.temporaryPassword);
    s1Pw = r.data.temporaryPassword;
    expect(await loginStaff(s1Email, s1.temporaryPassword), 401); // old password dead
    const l = expect(await loginStaff(s1Email, r.data.temporaryPassword), 200);
    assert.equal(l.data.mustChangePassword, true);
    expect(await admin('POST', `/staff/${s1.id}/reset-password`, { token: c.otherToken }), 403);
});

suite.test('deactivate: login is refused (403), filter isActive=false lists it, reactivate works', async () => {
    const r = expect(await admin('PATCH', `/staff/${s1.id}`, { token: c.token, body: { isActive: false } }), 200);
    assert.equal(r.data.isActive, false);
    expect(await loginStaff(s1Email, s1Pw), 403); // right password, but the account is deactivated
    const list = expect(await admin('GET', '/staff?isActive=false&limit=100', { token: c.token })).data;
    assert.ok(list.items.some((x) => x.id === s1.id));
    assert.equal((await admin('PATCH', `/staff/${s1.id}`, { token: c.token, body: { isActive: true } })).status, 200);
});

suite.run(async () => {
    if (!c) return; // setup failed, nothing to clean
    if (made.length) await c.prisma.gymStaff.deleteMany({ where: { id: { in: made } } });
    await c.cleanup();
});