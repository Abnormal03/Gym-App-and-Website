const { ok, created, asyncHandler } = require('../utils/responses');
const checkInService = require('../services/checkIn.service');
const { getMyStats } = require('../services/memberStats.service');
const { getMyBadges } = require('../services/badge.service');

exports.getPass = asyncHandler(async (req, res) => {
    const result = await checkInService.getMemberPass(req.auth, req.query.gymId);
    return ok(res, result);
});

exports.scan = asyncHandler(async (req, res) => {
    const result = await checkInService.recordCheckIn(req.auth, {
        token: req.body.token,
        gymId: req.body.gymId,
    });
    return created(res, result);
});

exports.manual = asyncHandler(async (req, res) => {
    const result = await checkInService.recordCheckIn(req.auth, {
        userId: req.body.userId,
        gymId: req.body.gymId,
    });
    return created(res, result);
});

exports.today = asyncHandler(async (req, res) => {
    const result = await checkInService.getTodayCheckIns(req.auth, req.query.gymId);
    return ok(res, result);
});

exports.searchMembers = asyncHandler(async (req, res) => {
    const result = await checkInService.searchMembers(req.auth, req.query.gymId, req.query.q);
    return ok(res, result);
});

exports.getStats = asyncHandler(async (req, res) => {
    const result = await getMyStats(req.auth.userId);
    return ok(res, result);
});

exports.getBadges = asyncHandler(async (req, res) => {
    const result = await getMyBadges(req.auth);
    return ok(res, result);
});
