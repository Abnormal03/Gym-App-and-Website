/**
 * Time helpers. RULES:
 *  - Every Date in the database and in memory is a UTC instant.
 *  - "Addis time" = UTC+3, all year (Ethiopia has no daylight saving).
 *  - Addis-LOCAL values only exist as strings: 'YYYY-MM-DD' (fields ending in LocalDate) and 'HH:mm' (Gym.openingTime/closingTime).
 */

const MS_PER_MINUTE = 60_000;
const MS_PER_HOUR = 3_600_000;
const MS_PER_DAY = 86_400_000;
const ADDIS_OFFSET_MS = 3 * MS_PER_HOUR;

/** Period boundaries in Addis hours, [start, end). Same values as the Prisma `Period` enum. */
const PERIOD_HOURS = {
    MORNING: { start: 6, end: 12 },
    AFTERNOON: { start: 12, end: 17 },
    EVENING: { start: 17, end: 22 },
};

const pad = (n, width = 2) => String(n).padStart(width, '0');

/** Shift an instant by +3h so the getUTC* methods return Addis wall-clock values. Internal use only. */
const shifted = (d) => new Date(d.getTime() + ADDIS_OFFSET_MS);

// ---------- Reading Addis wall-clock values from a UTC instant ----------

/** 'YYYY-MM-DD' of the Addis calendar day. Example: 2026-10-11T21:30Z -> '2026-10-12'. */
function toAddisDate(d) {
    const s = shifted(d);
    return `${s.getUTCFullYear()}-${pad(s.getUTCMonth() + 1)}-${pad(s.getUTCDate())}`;
}

/** 0 = Sunday ... 6 = Saturday in Addis time (same numbering as ProviderAvailability.dayOfWeek and Package.allowedDays). */
function addisDayOfWeek(d) {
    return shifted(d).getUTCDay();
}

/** Minutes since Addis midnight (0-1439). */
function addisMinutesOfDay(d) {
    const s = shifted(d);
    return s.getUTCHours() * 60 + s.getUTCMinutes();
}

/** 'MORNING' (06-12), 'AFTERNOON' (12-17), 'EVENING' (17-22) or null outside 06:00-22:00. */
function periodOf(d) {
    const h = shifted(d).getUTCHours();
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

/** Addis date 'YYYY-MM-DD' + Addis time 'HH:mm' -> UTC instant. ('2026-10-12', '07:00') -> 2026-10-12T04:00:00Z */
function addisToUtc(dateStr, hhmm = '00:00') {
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
    return new Date(utcDate.getTime() - ADDIS_OFFSET_MS);
}

/** UTC instant of 00:00 Addis on the same Addis day as d. */
const startOfAddisDay = (d) => addisToUtc(toAddisDate(d));

/** 'YYYY-MM-DD' one day earlier (used by streaks). */
const previousAddisDate = (dateStr) => toAddisDate(addDays(addisToUtc(dateStr), -1));

/** 'YYYY-MM-DD' one day later. */
const nextAddisDate = (dateStr) => toAddisDate(addDays(addisToUtc(dateStr), 1));

const isSameAddisDay = (a, b) => toAddisDate(a) === toAddisDate(b);

/** Instant -> 'YYYY-MM-DDTHH:mm:ss+03:00' (the format used on the wire). */
function toIsoAddis(d) {
    const s = shifted(d);
    return (
        `${s.getUTCFullYear()}-${pad(s.getUTCMonth() + 1)}-${pad(s.getUTCDate())}` +
        `T${pad(s.getUTCHours())}:${pad(s.getUTCMinutes())}:${pad(s.getUTCSeconds())}+03:00`
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
    toAddisDate,
    addisDayOfWeek,
    addisMinutesOfDay,
    periodOf,
    periodOfEnd,
    addMinutes,
    addHours,
    addDays,
    parseHHmm,
    addisToUtc,
    startOfAddisDay,
    previousAddisDate,
    nextAddisDate,
    isSameAddisDay,
    toIsoAddis,
    overlaps,
};