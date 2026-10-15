/**
 * Pure rules for check-in (no database). Easy to unit test: see scripts/check-a4-core.js.
 * Dates, weekdays, periods, and clock values are evaluated in UTC.
 */
const { utcDayOfWeek, periodOf, utcMinutesOfDay, parseHHmm, previousUtcDate } = require('../utils/time');

/** Does the package's weekday / period restriction allow `now`? (empty list = no restriction) */
function packageAllowsNow(pkg, now) {
    if (pkg.allowedDays.length > 0 && !pkg.allowedDays.includes(utcDayOfWeek(now))) {
        return { ok: false, reason: 'WRONG_DAY' };
    }
    const period = periodOf(now);
    if (pkg.allowedPeriods.length > 0 && (!period || !pkg.allowedPeriods.includes(period))) {
        return { ok: false, reason: 'WRONG_PERIOD' };
    }
    return { ok: true };
}

/** Gym.openingTime / closingTime are 'HH:mm' UTC clock values. Open from opening (inclusive) to closing (exclusive). */
function isWithinGymHours(gym, now) {
    const minutes = utcMinutesOfDay(now);
    return minutes >= parseHHmm(gym.openingTime) && minutes < parseHHmm(gym.closingTime);
}

/**
 * New streak numbers after a workout on `today` ('YYYY-MM-DD', UTC).
 *  - same day as the last workout  -> streak unchanged (it is still the same day of the streak)
 *  - the day after the last one    -> streak + 1
 *  - any other gap (or first ever) -> streak restarts at 1
 * totalWorkouts counts every check-in, so two check-ins on one day are two workouts but one streak day.
 */
function computeStreak(stats, today) {
    const prev = stats || { totalWorkouts: 0, currentStreak: 0, longestStreak: 0, lastWorkoutLocalDate: null };
    const last = prev.lastWorkoutLocalDate;
    let current;
    if (last && last >= today) current = Math.max(prev.currentStreak, 1); // same day (or clock oddity): unchanged
    else if (last === previousUtcDate(today)) current = prev.currentStreak + 1;
    else current = 1;
    return {
        totalWorkouts: prev.totalWorkouts + 1,
        currentStreak: current,
        longestStreak: Math.max(prev.longestStreak, current),
        lastWorkoutLocalDate: today,
    };
}

/** The streak a member should SEE now: it silently drops to 0 once a whole day was missed (no cron needed). */
function effectiveStreak(stats, today) {
    if (!stats || !stats.lastWorkoutLocalDate) return 0;
    const last = stats.lastWorkoutLocalDate;
    return last >= today || last === previousUtcDate(today) ? stats.currentStreak : 0;
}

/** '+251911000999' -> '+2519*****999'. Staff can recognise a member without seeing the whole number. */
function maskPhone(phone) {
    if (!phone) return null;
    if (phone.length < 8) return `***${phone.slice(-2)}`;
    return `${phone.slice(0, 5)}${'*'.repeat(phone.length - 8)}${phone.slice(-3)}`;
}

module.exports = { packageAllowsNow, isWithinGymHours, computeStreak, effectiveStreak, maskPhone };