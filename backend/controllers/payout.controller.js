const payoutService = require('../services/payout.service');
const { ok, created, asyncHandler } = require('../utils/responses');

exports.getMyEarnings = asyncHandler(async (req, res) => {
    const result = await payoutService.getMyEarnings(req.auth);
    return ok(res, result);
});

exports.requestPayout = asyncHandler(async (req, res) => {
    const result = await payoutService.requestPayout(req.auth, req.body.gymId);
    return created(res, result);
});

exports.getMyPayouts = asyncHandler(async (req, res) => {
    const result = await payoutService.getMyPayouts(req.auth);
    return ok(res, result);
});

exports.getAdminPayouts = asyncHandler(async (req, res) => {
    const result = await payoutService.getAdminPayouts(req.auth, req.query);
    return ok(res, result);
});

exports.markPayoutPaid = asyncHandler(async (req, res) => {
    const result = await payoutService.markPayoutPaid(req.auth, req.params.id, req.body);
    return ok(res, result);
});

exports.rejectPayout = asyncHandler(async (req, res) => {
    const result = await payoutService.rejectPayout(req.auth, req.params.id, req.body);
    return ok(res, result);
});
