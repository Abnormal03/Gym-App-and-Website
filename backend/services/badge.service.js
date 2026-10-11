/**
 * STUB until task A4 (and A5 for provider badges). Other code already calls it, so the signature is fixed:
 *
 *   awardBadges(tx, { userId } | { providerId }, event)
 *
 * Events that will be used:
 *   member:   'CHECK_IN'          (FIRST_WORKOUT, STREAK_3, STREAK_7, STREAK_30)
 *   provider: 'SESSION_COMPLETED' (FIRST_SESSION, SESSIONS_50, SESSIONS_100)
 *             'RATING'            (RATING_4_5)
 *
 * It will insert at most one UserBadge per badge and return the badges newly awarded.
 * For now it does nothing, so callers can use it without waiting.
 */
// eslint-disable-next-line no-unused-vars
async function awardBadges(tx, target, event) {
    return [];
}

module.exports = { awardBadges };