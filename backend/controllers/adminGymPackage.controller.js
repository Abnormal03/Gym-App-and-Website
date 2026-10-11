const { ok, asyncHandler } = require('../utils/responses');
const v = require('../validators/admin.validator');
const service = require('../services/gymPackage.service');

exports.create = asyncHandler(async (req, res) =>
    ok(res, await service.createGymPackage(req.auth.adminId, v.createGymPackage.parse(req.body)), 201));

exports.list = asyncHandler(async (req, res) =>
    ok(res, await service.listGymPackages(req.auth.adminId, v.listGymPackagesQuery.parse(req.query), req.query)));

exports.get = asyncHandler(async (req, res) =>
    ok(res, await service.getGymPackage(req.auth.adminId, req.params.id)));

exports.update = asyncHandler(async (req, res) =>
    ok(res, await service.updateGymPackage(req.auth.adminId, req.params.id, v.updateGymPackage.parse(req.body))));

exports.deactivate = asyncHandler(async (req, res) =>
    ok(res, await service.deactivateGymPackage(req.auth.adminId, req.params.id)));