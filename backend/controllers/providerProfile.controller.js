const { ok, asyncHandler } = require('../utils/responses');
const v = require('../validators/providerPortal.validator');
const service = require('../services/providerProfile.service');

// req.auth.providerId comes from requireRole(...) and is always the logged-in provider.

exports.get = asyncHandler(async (req, res) => ok(res, await service.getMyProfile(req.auth.providerId)));

exports.update = asyncHandler(async (req, res) =>
    ok(res, await service.updateMyProfile(req.auth.providerId, v.updateProfile.parse(req.body))));