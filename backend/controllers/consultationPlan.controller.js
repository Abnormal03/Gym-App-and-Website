const { ok, asyncHandler } = require('../utils/responses');
const { getConsultationPlan, updateConsultationPlan } = require('../services/consultationPlan.service');

/**
 * GET /api/me/consultation-plan
 * Returns the effective price and chatDays for the logged-in nutrition consultant.
 */
exports.get = asyncHandler(async (req, res) => {
    const plan = await getConsultationPlan(req.auth.providerId);
    return ok(res, plan);
});

/**
 * PUT /api/me/consultation-plan
 * Body: { consultationPrice?: number|null, chatDays?: number|null }
 *   - omit a field to leave it unchanged
 *   - send null to reset a field back to the platform default
 */
exports.update = asyncHandler(async (req, res) => {
    const { consultationPrice, chatDays } = req.body ?? {};

    // Build input object only from keys the caller actually sent
    const input = {};
    if ('consultationPrice' in (req.body ?? {})) input.consultationPrice = consultationPrice ?? null;
    if ('chatDays' in (req.body ?? {})) input.chatDays = chatDays ?? null;

    const plan = await updateConsultationPlan(req.auth.providerId, input);
    return ok(res, plan);
});
