const { ok, asyncHandler } = require('../utils/responses');
const v = require('../validators/providerPortal.validator');
const service = require('../services/providerAvailability.service');

exports.get = asyncHandler(async (req, res) => ok(res, await service.getMyAvailability(req.auth.providerId)));

exports.replace = asyncHandler(async (req, res) => {
    const { slots } = v.replaceAvailability.parse(req.body);
    return ok(res, await service.replaceMyAvailability(req.auth.providerId, slots));
});