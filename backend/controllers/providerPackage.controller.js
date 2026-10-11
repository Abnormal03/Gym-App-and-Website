const { ok, asyncHandler } = require('../utils/responses');
const v = require('../validators/providerPortal.validator');
const service = require('../services/providerPackage.service');

exports.create = asyncHandler(async (req, res) =>
    ok(res, await service.createMyPackage(req.auth.providerId, v.createPackage.parse(req.body)), 201));

exports.list = asyncHandler(async (req, res) =>
    ok(res, await service.listMyPackages(req.auth.providerId, v.listPackagesQuery.parse(req.query), req.query)));

exports.get = asyncHandler(async (req, res) =>
    ok(res, await service.getMyPackage(req.auth.providerId, req.params.id)));

exports.update = asyncHandler(async (req, res) =>
    ok(res, await service.updateMyPackage(req.auth.providerId, req.params.id, v.updatePackage.parse(req.body))));

exports.deactivate = asyncHandler(async (req, res) =>
    ok(res, await service.deactivateMyPackage(req.auth.providerId, req.params.id)));