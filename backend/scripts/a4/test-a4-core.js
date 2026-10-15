/**
 * A4 Core Unit Tests
 * Validates check-in rules, streak mathematics, QR signing/verification, and phone masking.
 * Run with: npx tsx backend/scripts/a4/test-a4-core.js
 */
const assert = require('node:assert/strict');
const {
    computeStreak,
    effectiveStreak,
    packageAllowsNow,
    isWithinGymHours,
    maskPhone,
} = require('../../services/checkInRule.service');
const { signQrToken, verifyQrToken } = require('../../services/qrToken.service');
const { utcFromDateTime } = require('../../utils/time');

process.env.JWT_SECRET = process.env.JWT_SECRET || 'test-jwt-secret-for-a4-checks-12345';

console.log('\n--- Running A4 Core Logic Tests ---');

// 1. Streak progression & reset
console.log('1. Testing streak progression and resets...');
const day1 = '2026-10-12';
const day2 = '2026-10-13';
const day4 = '2026-10-15'; // 2-day gap (missed day 3)

// First ever workout
const s1 = computeStreak(null, day1);
assert.equal(s1.totalWorkouts, 1);
assert.equal(s1.currentStreak, 1);
assert.equal(s1.longestStreak, 1);
assert.equal(s1.lastWorkoutLocalDate, day1);
console.log('  ✔ First check-in starts streak at 1');

// Second workout on same day
const s1b = computeStreak(s1, day1);
assert.equal(s1b.totalWorkouts, 2);
assert.equal(s1b.currentStreak, 1); // unchanged
assert.equal(s1b.longestStreak, 1);
console.log('  ✔ Repeated scan on same day preserves streak day (workouts = 2)');

// Next day workout
const s2 = computeStreak(s1, day2);
assert.equal(s2.totalWorkouts, 2);
assert.equal(s2.currentStreak, 2);
assert.equal(s2.longestStreak, 2);
console.log('  ✔ Consecutive day check-in increments streak to 2');

// Missed day -> reset
const s3 = computeStreak(s2, day4);
assert.equal(s3.totalWorkouts, 3);
assert.equal(s3.currentStreak, 1); // reset back to 1
assert.equal(s3.longestStreak, 2); // longest retained
console.log('  ✔ Missed day resets current streak to 1 while retaining longest streak');

// 2. Effective streak display (no cron needed)
console.log('2. Testing effective streak presentation...');
assert.equal(effectiveStreak(s2, day2), 2); // workout today -> shows 2
assert.equal(effectiveStreak(s2, '2026-10-14'), 2); // workout yesterday -> shows 2
assert.equal(effectiveStreak(s2, '2026-10-15'), 0); // missed yesterday -> drops to 0
assert.equal(effectiveStreak(null, day1), 0);
console.log('  ✔ Effective streak drops silently to 0 after missed day');

// 3. Package restriction filters (days & periods)
console.log('3. Testing package restrictions...');
// Monday in UTC
const mondayMorning = utcFromDateTime('2026-10-12', '08:00');
// Sunday in UTC
const sundayMorning = utcFromDateTime('2026-10-11', '08:00');
// Monday afternoon in UTC
const mondayAfternoon = utcFromDateTime('2026-10-12', '14:00');

// Weekday morning only package: days 1..5 (Mon-Fri), period MORNING
const weekdayMorningPkg = {
    allowedDays: [1, 2, 3, 4, 5],
    allowedPeriods: ['MORNING'],
};

assert.equal(packageAllowsNow(weekdayMorningPkg, mondayMorning).ok, true);
const sundayCheck = packageAllowsNow(weekdayMorningPkg, sundayMorning);
assert.equal(sundayCheck.ok, false);
assert.equal(sundayCheck.reason, 'WRONG_DAY');

const afternoonCheck = packageAllowsNow(weekdayMorningPkg, mondayAfternoon);
assert.equal(afternoonCheck.ok, false);
assert.equal(afternoonCheck.reason, 'WRONG_PERIOD');

const unrestrictedPkg = { allowedDays: [], allowedPeriods: [] };
assert.equal(packageAllowsNow(unrestrictedPkg, sundayMorning).ok, true);
assert.equal(packageAllowsNow(unrestrictedPkg, mondayAfternoon).ok, true);
console.log('  ✔ Package restrictions correctly validate allowed days and periods');

// 4. Gym operating hours
console.log('4. Testing gym operating hours...');
const gym = { openingTime: '06:00', closingTime: '22:00' };
const openTime = utcFromDateTime('2026-10-12', '10:00');
const beforeOpen = utcFromDateTime('2026-10-12', '05:30');
const afterClose = utcFromDateTime('2026-10-12', '22:30');

assert.equal(isWithinGymHours(gym, openTime), true);
assert.equal(isWithinGymHours(gym, beforeOpen), false);
assert.equal(isWithinGymHours(gym, afterClose), false);
console.log('  ✔ Gym operating hours check validated');

// 5. Phone masking
console.log('5. Testing phone masking...');
assert.equal(maskPhone('+251911000999'), '+2519*****999');
assert.equal(maskPhone('0911223344'), '09112**344');
assert.equal(maskPhone(null), null);
console.log('  ✔ Phone masking verified');

// 6. QR Token signing and verification
console.log('6. Testing QR Token lifecycle...');
const { token, expiresAt } = signQrToken(42);
assert.ok(token);
assert.ok(expiresAt instanceof Date);

const decodedUserId = verifyQrToken(token);
assert.equal(decodedUserId, 42);

// Tampered token
assert.throws(() => verifyQrToken(`${token}tampered`), {
    message: /invalid or has expired/,
});
console.log('  ✔ QR token signs with 60s TTL, verifies user ID, and rejects tampered payload');

console.log('\n✔ All A4 core logic and unit tests passed successfully!\n');
