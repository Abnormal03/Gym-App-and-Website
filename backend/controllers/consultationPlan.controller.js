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
 * Pass null to reset a field to the platform default.
 */
exports.update = asyncHandler(async (req, res) => {
    const body = req.body?.plan ?? req.body?.consultationPlan ?? req.body?.data ?? req.body ?? {};
    const consultationPrice = body.consultationPrice ?? body.price;
    const chatDays = body.chatDays ?? body.chatAccessDays;

    // Build input object only from keys the caller actually sent
    const input = {};
    if ('consultationPrice' in body || 'price' in body) input.consultationPrice = consultationPrice ?? null;
    if ('chatDays' in body || 'chatAccessDays' in body) input.chatDays = chatDays ?? null;

    const plan = await updateConsultationPlan(req.auth.providerId, input);
    return ok(res, plan);
});
