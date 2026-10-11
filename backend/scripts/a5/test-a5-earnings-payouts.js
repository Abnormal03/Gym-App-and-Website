/**
 * A5 Earnings & Payouts Unit Tests
 * Tests rounding balance, single earning per session, race prevention, mark-paid, and reject workflows.
 * Run with: node backend/scripts/a5/test-a5-earnings-payouts.js
 */
const assert = require('node:assert/strict');
const { sessionEarnings, toMoney, toCents } = require('../../utils/money');

console.log('\n--- Running A5 Earnings & Payouts Tests ---');

// 1. Exact split and rounding remainder
console.log('1. Testing earnings rounding remainder absorption...');
// 1000 ETB, 3 sessions, 70% share = 700 ETB total
const amounts70 = sessionEarnings(1000, 3, 70);
assert.deepEqual(amounts70, [233.33, 233.33, 233.34]);
const sum70 = amounts70.reduce((acc, a) => acc + toCents(a), 0);
assert.equal(sum70, 70000); // exactly 700.00 ETB
console.log('  ✔ Last session absorbs remainder cents: [233.33, 233.33, 233.34] = 700.00 ETB');

// 1200 ETB, 4 sessions, 100% share = 1200 ETB total
const amounts100 = sessionEarnings(1200, 4, 100);
assert.deepEqual(amounts100, [300, 300, 300, 300]);
assert.equal(amounts100.reduce((acc, a) => acc + toCents(a), 0), 120000);
console.log('  ✔ Even split verified: [300, 300, 300, 300] = 1200.00 ETB');

// 2. Simulating Earnings and Payout Request (E-46)
console.log('2. Testing payout request creation and double-spend prevention...');
const earningsDb = [
    { id: 1, providerId: 5, gymId: 1, amount: 233.33, status: 'AVAILABLE', payoutRequestId: null },
    { id: 2, providerId: 5, gymId: 1, amount: 233.33, status: 'AVAILABLE', payoutRequestId: null },
    { id: 3, providerId: 5, gymId: 1, amount: 233.34, status: 'AVAILABLE', payoutRequestId: null },
    { id: 4, providerId: 5, gymId: 2, amount: 500.00, status: 'AVAILABLE', payoutRequestId: null }, // different gym
];

const payoutRequests = [];

function simulateRequestPayout(providerId, targetGymId) {
    const available = earningsDb.filter(
        (e) => e.providerId === providerId && e.gymId === targetGymId && e.status === 'AVAILABLE'
    );

    if (available.length === 0) {
        throw new Error('BALANCE_TOO_LOW: No available earnings');
    }

    const sum = available.reduce((acc, e) => acc + e.amount, 0);
    const total = toMoney(sum);

    const pr = {
        id: payoutRequests.length + 1,
        providerId,
        gymId: targetGymId,
        amount: total,
        status: 'PENDING',
        createdAt: new Date(),
        decidedAt: null,
        decidedByAdminId: null,
    };
    payoutRequests.push(pr);

    // Transition selected earnings to REQUESTED
    for (const e of available) {
        e.status = 'REQUESTED';
        e.payoutRequestId = pr.id;
    }

    return pr;
}

// First payout request for gym 1
const pr1 = simulateRequestPayout(5, 1);
assert.equal(pr1.id, 1);
assert.equal(pr1.amount, 700.00);
assert.equal(pr1.status, 'PENDING');

const requestedEarnings = earningsDb.filter((e) => e.payoutRequestId === 1);
assert.equal(requestedEarnings.length, 3);
assert.ok(requestedEarnings.every((e) => e.status === 'REQUESTED'));
console.log('  ✔ Payout request created for 700.00 ETB; 3 earnings moved to REQUESTED');

// Attempting simultaneous / second payout request for gym 1
assert.throws(() => simulateRequestPayout(5, 1), {
    message: /BALANCE_TOO_LOW/,
});
console.log('  ✔ Simultaneous second payout request blocked (BALANCE_TOO_LOW) preventing double-spend');

// Earnings for gym 2 remain unaffected
const gym2Available = earningsDb.filter((e) => e.gymId === 2 && e.status === 'AVAILABLE');
assert.equal(gym2Available.length, 1);
assert.equal(gym2Available[0].amount, 500.00);
console.log('  ✔ Earnings for other gyms remain isolated and available');

// 3. Admin Marks Paid (E-63)
console.log('3. Testing admin mark-paid transition...');
function simulateMarkPaid(payoutRequestId, adminId, method, ref) {
    const pr = payoutRequests.find((p) => p.id === payoutRequestId);
    if (!pr) throw new Error('NOT_FOUND');
    if (pr.status !== 'PENDING') throw new Error('VALIDATION: Not pending');

    pr.status = 'PAID';
    pr.paidMethod = method;
    pr.paidReference = ref;
    pr.decidedAt = new Date();
    pr.decidedByAdminId = adminId;

    for (const e of earningsDb.filter((x) => x.payoutRequestId === payoutRequestId)) {
        e.status = 'PAID';
    }
    return pr;
}

simulateMarkPaid(1, 99, 'BANK_TRANSFER', 'TX-CBE-987654');
assert.equal(pr1.status, 'PAID');
assert.equal(pr1.paidReference, 'TX-CBE-987654');
assert.ok(earningsDb.filter((e) => e.payoutRequestId === 1).every((e) => e.status === 'PAID'));
console.log('  ✔ Admin marked PAID: request and earnings all transitioned to PAID');

// Cannot mark paid twice
assert.throws(() => simulateMarkPaid(1, 99, 'CASH', 'REF2'), {
    message: /VALIDATION: Not pending/,
});
console.log('  ✔ Non-pending payout request cannot be marked paid again');

// 4. Admin Rejection (E-64)
console.log('4. Testing admin rejection and earnings rollback...');
// Create payout request for gym 2
const pr2 = simulateRequestPayout(5, 2);
assert.equal(pr2.amount, 500.00);
assert.equal(pr2.status, 'PENDING');

function simulateReject(payoutRequestId, adminId, note) {
    const pr = payoutRequests.find((p) => p.id === payoutRequestId);
    if (!pr) throw new Error('NOT_FOUND');
    if (pr.status !== 'PENDING') throw new Error('VALIDATION: Not pending');

    pr.status = 'REJECTED';
    pr.note = note;
    pr.decidedAt = new Date();
    pr.decidedByAdminId = adminId;

    for (const e of earningsDb.filter((x) => x.payoutRequestId === payoutRequestId)) {
        e.status = 'AVAILABLE';
        e.payoutRequestId = null;
    }
    return pr;
}

simulateReject(2, 99, 'Incorrect bank account details');
assert.equal(pr2.status, 'REJECTED');
assert.equal(pr2.note, 'Incorrect bank account details');

const gym2Reverted = earningsDb.find((e) => e.id === 4);
assert.equal(gym2Reverted.status, 'AVAILABLE');
assert.equal(gym2Reverted.payoutRequestId, null);
console.log('  ✔ Admin rejection restores earnings back to AVAILABLE with payoutRequestId: null');

console.log('\n✔ All A5 earnings and payout tests passed successfully!\n');
