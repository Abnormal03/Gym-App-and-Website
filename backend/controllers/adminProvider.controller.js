const { ok, asyncHandler } = require('../utils/responses');
const v = require('../validators/admin.validator');
const service = require('../services/provider.service');

exports.create = asyncHandler(async (req, res) =>
    ok(res, await service.createProvider(req.auth.adminId, v.createProvider.parse(req.body)), 201));

exports.list = asyncHandler(async (req, res) =>
    ok(res, await service.listProviders(req.auth.adminId, v.listProvidersQuery.parse(req.query), req.query)));

exports.get = asyncHandler(async (req, res) =>
    ok(res, await service.getProvider(req.auth.adminId, req.params.id)));

exports.update = asyncHandler(async (req, res) =>
    ok(res, await service.updateProvider(req.auth.adminId, req.params.id, v.updateProvider.parse(req.body))));

exports.resetPassword = asyncHandler(async (req, res) =>
    ok(res, await service.resetProviderPassword(req.auth.adminId, req.params.id)));