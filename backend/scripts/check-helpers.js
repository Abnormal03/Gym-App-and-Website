/** Quick self-check for the A1 helpers (no test framework needed).  Run: node scripts/check-helpers.js */
import assert from "node:assert/strict";
import {
  utcFromDateTime,
  parseUtcInstant,
  parseUtcSlotRange,
  utcDayOfWeek,
  isSameUtcDay,
  nextUtcDate,
  overlaps,
  parseHHmm,
  periodOf,
  periodOfEnd,
  isWithinGymOpeningHours,
  previousUtcDate,
  startOfUtcDay,
  toUtcDate,
  toIsoUtc,
  addMinutes,
} from "../utils/time.js";
import {
  percentOf,
  sessionEarnings,
  splitAmount,
  toCents,
  toMoney,
} from "../utils/money.js";

const utc = (s) => new Date(s);
assert.equal(
  parseUtcInstant("2026-10-17T03:30:00").toISOString(),
  "2026-10-17T03:30:00.000Z",
);
const utcSlotRange = parseUtcSlotRange(
  "2026-10-17T10:00:00",
  "2026-10-17T11:00:00",
);
assert.equal(utcSlotRange.start.toISOString(), "2026-10-17T10:00:00.000Z");
assert.equal(utcSlotRange.end.toISOString(), "2026-10-17T11:00:00.000Z");
assert.equal(
  isWithinGymOpeningHours(utcSlotRange.start, utcSlotRange.end, "06:00", "22:00"),
  true,
);
assert.equal(
  isWithinGymOpeningHours(utcSlotRange.start, utcSlotRange.end, "6:00", "22:00"),
  true,
);
assert.equal(
  isWithinGymOpeningHours(
    parseUtcInstant("2026-10-16T04:00:00"),
    parseUtcInstant("2026-10-16T05:00:00"),
    "6:00",
    "22:00",
  ),
  false,
);
assert.equal(
  isWithinGymOpeningHours(
    utcSlotRange.start,
    utcSlotRange.end,
    "11:00",
    "22:00",
  ),
  false,
);
assert.equal(
  isWithinGymOpeningHours(
    utc("2026-10-17T21:00:00.001Z"),
    utc("2026-10-17T22:00:00.001Z"),
    "06:00",
    "22:00",
  ),
  false,
);
assert.equal(
  isWithinGymOpeningHours(
    utc("2026-10-17T21:30:00Z"),
    utc("2026-10-18T00:30:00Z"),
    "06:00",
    "22:00",
  ),
  false,
);
assert.throws(
  () => isWithinGymOpeningHours(utcSlotRange.start, utcSlotRange.end, "25:00", "22:00"),
  { message: "Invalid gym opening hours" },
);

// ---- time: UTC date and weekday extraction ----
assert.equal(toUtcDate(utc("2026-10-11T20:59:59Z")), "2026-10-11");
assert.equal(toUtcDate(utc("2026-10-11T21:00:00Z")), "2026-10-11");
assert.equal(utcDayOfWeek(utc("2026-10-11T08:00:00Z")), 0); // Sunday
assert.equal(utcDayOfWeek(utc("2026-10-11T21:30:00Z")), 0); // Sunday

// ---- time: period boundaries (UTC hours) ----
assert.equal(periodOf(utc("2026-10-12T05:59:00Z")), null);
assert.equal(periodOf(utc("2026-10-12T06:00:00Z")), "MORNING");
assert.equal(periodOf(utc("2026-10-12T11:59:00Z")), "MORNING");
assert.equal(periodOf(utc("2026-10-12T12:00:00Z")), "AFTERNOON");
assert.equal(periodOf(utc("2026-10-12T16:59:00Z")), "AFTERNOON");
assert.equal(periodOf(utc("2026-10-12T17:00:00Z")), "EVENING");
assert.equal(periodOf(utc("2026-10-12T21:59:00Z")), "EVENING");
assert.equal(periodOf(utc("2026-10-12T22:00:00Z")), null);
assert.equal(periodOfEnd(utc("2026-10-12T09:00:00Z")), "MORNING"); // a session ending at 12:00 is still morning
assert.equal(periodOfEnd(utc("2026-10-12T22:00:00Z")), "EVENING"); // ending at 22:00 is still evening

// ---- time: building instants ----
assert.equal(
  utcFromDateTime("2026-10-12", "07:00").toISOString(),
  "2026-10-12T07:00:00.000Z",
);
assert.equal(
  utcFromDateTime("2026-10-12").toISOString(),
  "2026-10-12T00:00:00.000Z",
);
assert.equal(
  startOfUtcDay(utc("2026-10-12T05:00:00Z")).toISOString(),
  "2026-10-12T00:00:00.000Z",
);
assert.equal(previousUtcDate("2026-10-01"), "2026-09-30");
assert.equal(nextUtcDate("2026-12-31"), "2027-01-01");
assert.equal(
  toIsoUtc(utc("2026-10-12T04:30:00Z")),
  "2026-10-12T04:30:00Z",
);
assert.equal(
  isSameUtcDay(utc("2026-10-11T20:00:00Z"), utc("2026-10-11T22:00:00Z")),
  true,
); // same UTC day
assert.equal(parseHHmm("06:30"), 390);
assert.throws(() => parseHHmm("25:00"));

// ---- time: overlap (touching ends do not overlap) ----
const a = utc("2026-10-12T04:00:00Z");
assert.equal(
  overlaps(a, addMinutes(a, 60), addMinutes(a, 60), addMinutes(a, 120)),
  false,
);
assert.equal(
  overlaps(a, addMinutes(a, 60), addMinutes(a, 30), addMinutes(a, 90)),
  true,
);

// ---- money ----
assert.equal(toMoney(1.005), 1.01);
assert.equal(toMoney("250.456"), 250.46);
assert.equal(toMoney({ toString: () => "99.999" }), 100);
assert.equal(toCents(12.34), 1234);
assert.equal(percentOf(1200, 70), 840);
assert.deepEqual(splitAmount(1000, 3), [333.33, 333.33, 333.34]);
assert.equal(
  splitAmount(1000, 3).reduce((s, x) => s + toCents(x), 0),
  100000,
); // adds up exactly
assert.deepEqual(sessionEarnings(1200, 4, 100), [300, 300, 300, 300]);
const e = sessionEarnings(1000, 3, 70); // 700 split in 3
assert.equal(
  e.reduce((s, x) => s + toCents(x), 0),
  70000,
);
assert.throws(() => toMoney(NaN));

console.log("All helper checks passed");
