const { ok, asyncHandler } = require('../utils/responses');
const service = require('../services/providerClient.service');

exports.list = asyncHandler(async (req, res) => ok(res, await service.listMyClients(req.auth, req.query)));