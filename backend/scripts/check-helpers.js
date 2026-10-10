/** Quick self-check for the A1 helpers (no test framework needed).  Run: node scripts/check-helpers.js */
import assert from 'node:assert/strict';
import {
    addisToUtc, addisDayOfWeek, isSameAddisDay, nextAddisDate, overlaps, parseHHmm,
    periodOf, periodOfEnd, previousAddisDate, startOfAddisDay, toAddisDate, toIsoAddis, addMinutes,
} from '../src/utils/time.js';
import { percentOf, sessionEarnings, splitAmount, toCents, toMoney } from '../src/utils/money.js';

const utc = (s) => new Date(s);

// ---- time: Addis date crossing midnight (UTC+3) ----
assert.equal(toAddisDate(utc('2026-10-11T20:59:59Z')), '2026-10-11');
assert.equal(toAddisDate(utc('2026-10-11T21:00:00Z')), '2026-10-12'); // 00:00 Addis
assert.equal(addisDayOfWeek(utc('2026-10-11T08:00:00Z')), 0); // Sunday
assert.equal(addisDayOfWeek(utc('2026-10-11T21:30:00Z')), 1); // Monday in Addis

// ---- time: period boundaries (Addis hours) ----
assert.equal(periodOf(utc('2026-10-12T02:59:00Z')), null);        // 05:59
assert.equal(periodOf(utc('2026-10-12T03:00:00Z')), 'MORNING');   // 06:00
assert.equal(periodOf(utc('2026-10-12T08:59:00Z')), 'MORNING');   // 11:59
assert.equal(periodOf(utc('2026-10-12T09:00:00Z')), 'AFTERNOON'); // 12:00
assert.equal(periodOf(utc('2026-10-12T13:59:00Z')), 'AFTERNOON'); // 16:59
assert.equal(periodOf(utc('2026-10-12T14:00:00Z')), 'EVENING');   // 17:00
assert.equal(periodOf(utc('2026-10-12T18:59:00Z')), 'EVENING');   // 21:59
assert.equal(periodOf(utc('2026-10-12T19:00:00Z')), null);        // 22:00
assert.equal(periodOfEnd(utc('2026-10-12T09:00:00Z')), 'MORNING');  // a session ending at 12:00 is still morning
assert.equal(periodOfEnd(utc('2026-10-12T19:00:00Z')), 'EVENING');  // ending at 22:00 is still evening

// ---- time: building instants ----
assert.equal(addisToUtc('2026-10-12', '07:00').toISOString(), '2026-10-12T04:00:00.000Z');
assert.equal(addisToUtc('2026-10-12').toISOString(), '2026-10-11T21:00:00.000Z');
assert.equal(startOfAddisDay(utc('2026-10-12T05:00:00Z')).toISOString(), '2026-10-11T21:00:00.000Z');
assert.equal(previousAddisDate('2026-10-01'), '2026-09-30');
assert.equal(nextAddisDate('2026-12-31'), '2027-01-01');
assert.equal(toIsoAddis(utc('2026-10-12T04:30:00Z')), '2026-10-12T07:30:00+03:00');
assert.equal(isSameAddisDay(utc('2026-10-11T20:00:00Z'), utc('2026-10-11T22:00:00Z')), false); // midnight Addis between them
assert.equal(parseHHmm('06:30'), 390);
assert.throws(() => parseHHmm('25:00'));

// ---- time: overlap (touching ends do not overlap) ----
const a = utc('2026-10-12T04:00:00Z');
assert.equal(overlaps(a, addMinutes(a, 60), addMinutes(a, 60), addMinutes(a, 120)), false);
assert.equal(overlaps(a, addMinutes(a, 60), addMinutes(a, 30), addMinutes(a, 90)), true);

// ---- money ----
assert.equal(toMoney(1.005), 1.01);
assert.equal(toMoney('250.456'), 250.46);
assert.equal(toMoney({ toString: () => '99.999' }), 100);
assert.equal(toCents(12.34), 1234);
assert.equal(percentOf(1200, 70), 840);
assert.deepEqual(splitAmount(1000, 3), [333.33, 333.33, 333.34]);
assert.equal(splitAmount(1000, 3).reduce((s, x) => s + toCents(x), 0), 100000); // adds up exactly
assert.deepEqual(sessionEarnings(1200, 4, 100), [300, 300, 300, 300]);
const e = sessionEarnings(1000, 3, 70); // 700 split in 3
assert.equal(e.reduce((s, x) => s + toCents(x), 0), 70000);
assert.throws(() => toMoney(NaN));

console.log('All helper checks passed');
