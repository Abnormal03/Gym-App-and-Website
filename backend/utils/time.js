/**
 * Time helpers. RULES:
 *  - Every Date in the database and in memory is a UTC instant.
 *  - Timezone-free ISO date-times from the frontend are interpreted as UTC.
 *  - Calendar and schedule helpers operate directly on UTC values.
 */

const MS_PER_MINUTE = 60_000;
const MS_PER_HOUR = 3_600_000;
const MS_PER_DAY = 86_400_000;

/** Period boundaries in UTC hours, [start, end). Same values as the Prisma `Period` enum. */
const PERIOD_HOURS = {
    MORNING: { start: 6, end: 12 },
    AFTERNOON: { start: 12, end: 17 },
    EVENING: { start: 17, end: 22 },
};

const pad = (n, width = 2) => String(n).padStart(width, '0');

const ISO_DATETIME_WITHOUT_ZONE =
    /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}(?::\d{2}(?:\.\d{1,3})?)?$/;

/** Parse timezone-free ISO date-times as UTC so backend host timezone cannot change the instant. */
function parseUtcInstant(value) {
    const input =
        typeof value === 'string' && ISO_DATETIME_WITHOUT_ZONE.test(value)
            ? `${value}Z`
            : value;
    return new Date(input);
}

function parseUtcSlotRange(slotStart, slotEnd) {
    if (!slotStart || !slotEnd) {
        throw new Error("Slot start and end are required");
    }

    const start = parseUtcInstant(slotStart);
    const end = parseUtcInstant(slotEnd);

    if (!Number.isFinite(start.getTime()) || !Number.isFinite(end.getTime()) || start >= end) {
        throw new Error("Invalid slot range");
    }

    return { start, end };
}

// ---------- Reading UTC calendar and clock values ----------

/** 'YYYY-MM-DD' of the UTC calendar day. */
function toUtcDate(d) {
    return `${d.getUTCFullYear()}-${pad(d.getUTCMonth() + 1)}-${pad(d.getUTCDate())}`;
}

/** 0 = Sunday ... 6 = Saturday in UTC. */
function utcDayOfWeek(d) {
    return d.getUTCDay();
}

/** Minutes since UTC midnight (0-1439). */
function utcMinutesOfDay(d) {
    return d.getUTCHours() * 60 + d.getUTCMinutes();
}

/** Period for the UTC hour: MORNING (06-12), AFTERNOON (12-17), EVENING (17-22). */
function periodOf(d) {
    return periodForHour(d.getUTCHours());
}

function periodForHour(h) {
    for (const p of Object.keys(PERIOD_HOURS)) {
        const { start, end } = PERIOD_HOURS[p];
        if (h >= start && h < end) return p;
    }
    return null;
}

/** Period of the END of a window. The end is exclusive, so 12:00 belongs to MORNING and 22:00 to EVENING. */
function periodOfEnd(end) {
    return periodOf(new Date(end.getTime() - 1));
}

// ---------- Building UTC instants ----------

const addMinutes = (d, minutes) => new Date(d.getTime() + minutes * MS_PER_MINUTE);
const addHours = (d, hours) => new Date(d.getTime() + hours * MS_PER_HOUR);
const addDays = (d, days) => new Date(d.getTime() + days * MS_PER_DAY);

/** 'HH:mm' -> minutes since midnight. Throws on bad input. */
function parseHHmm(value) {
    const m = /^(\d{1,2}):(\d{2})$/.exec(value);
    if (!m) throw new Error(`Invalid time "${value}", expected HH:mm`);
    const h = Number(m[1]);
    const min = Number(m[2]);
    if (h > 23 || min > 59) throw new Error(`Invalid time "${value}", expected HH:mm`);
    return h * 60 + min;
}

function isWithinGymOpeningHours(start, end, opening, closing) {
    const isValidClock = (value) => {
        if (typeof value !== "string" || !/^\d{1,2}:\d{2}$/.test(value)) {
            return false;
        }

        const [hour, minute] = value.split(":").map(Number);
        return hour <= 23 && minute <= 59;
    };

    if (
        !isValidClock(opening) ||
        !isValidClock(closing) ||
        parseHHmm(opening) >= parseHHmm(closing)
    ) {
        throw new Error("Invalid gym opening hours");
    }

    const openingMs = parseHHmm(opening) * MS_PER_MINUTE;
    const closingMs = parseHHmm(closing) * MS_PER_MINUTE;
    const clockMilliseconds = (date) =>
        ((date.getUTCHours() * 60 + date.getUTCMinutes()) * 60 +
            date.getUTCSeconds()) *
            1000 +
        date.getUTCMilliseconds();

    return (
        toUtcDate(start) === toUtcDate(end) &&
        clockMilliseconds(start) >= openingMs &&
        clockMilliseconds(end) <= closingMs
    );
}

/** UTC date 'YYYY-MM-DD' + UTC time 'HH:mm' -> UTC instant. */
function utcFromDateTime(dateStr, hhmm = '00:00') {
    const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(dateStr);
    if (!m) throw new Error(`Invalid date "${dateStr}", expected YYYY-MM-DD`);
    const year = Number(m[1]);
    const monthIndex = Number(m[2]) - 1;
    const day = Number(m[3]);
    const minutes = parseHHmm(hhmm);
    const utcDate = new Date(Date.UTC(year, monthIndex, day, 0, minutes));
    if (utcDate.getUTCFullYear() !== year || utcDate.getUTCMonth() !== monthIndex || utcDate.getUTCDate() !== day) {
        throw new Error(`Invalid date "${dateStr}", expected YYYY-MM-DD`);
    }
    return utcDate;
}

/** UTC instant of 00:00 on the same UTC day as d. */
const startOfUtcDay = (d) => utcFromDateTime(toUtcDate(d));

/** UTC date string one day earlier (used by streaks). */
const previousUtcDate = (dateStr) => toUtcDate(addDays(utcFromDateTime(dateStr), -1));

/** UTC date string one day later. */
const nextUtcDate = (dateStr) => toUtcDate(addDays(utcFromDateTime(dateStr), 1));

const isSameUtcDay = (a, b) => toUtcDate(a) === toUtcDate(b);

/** Instant -> 'YYYY-MM-DDTHH:mm:ssZ' in UTC (the format used on the wire). */
function toIsoUtc(d) {
    return (
        `${d.getUTCFullYear()}-${pad(d.getUTCMonth() + 1)}-${pad(d.getUTCDate())}` +
        `T${pad(d.getUTCHours())}:${pad(d.getUTCMinutes())}:${pad(d.getUTCSeconds())}Z`
    );
}

/** True when [aStart, aEnd) overlaps [bStart, bEnd). Both intervals must be non-empty; touching ends do NOT overlap. */
const overlaps = (aStart, aEnd, bStart, bEnd) =>
    aStart.getTime() < aEnd.getTime() &&
    bStart.getTime() < bEnd.getTime() &&
    aStart.getTime() < bEnd.getTime() &&
    aEnd.getTime() > bStart.getTime();

module.exports = {
    PERIOD_HOURS,
    parseUtcInstant,
    parseUtcSlotRange,
    toUtcDate,
    utcDayOfWeek,
    utcMinutesOfDay,
    periodOf,
    periodOfEnd,
    addMinutes,
    addHours,
    addDays,
    parseHHmm,
    isWithinGymOpeningHours,
    utcFromDateTime,
    startOfUtcDay,
    previousUtcDate,
    nextUtcDate,
    isSameUtcDay,
    toIsoUtc,
    overlaps,
};