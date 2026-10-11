const { ok, asyncHandler } = require('../utils/responses');
const v = require('../validators/admin.validator');
const service = require('../services/staff.service');

// req.auth is set by requireRole('GYM_ADMIN'); the admin's id is req.auth.adminId.

exports.create = asyncHandler(async (req, res) =>
    ok(res, await service.createStaff(req.auth.adminId, v.createStaff.parse(req.body)), 201));

exports.list = asyncHandler(async (req, res) =>
    ok(res, await service.listStaff(req.auth.adminId, v.listStaffQuery.parse(req.query), req.query)));

exports.get = asyncHandler(async (req, res) =>
    ok(res, await service.getStaff(req.auth.adminId, req.params.id)));

exports.update = asyncHandler(async (req, res) =>
    ok(res, await service.updateStaff(req.auth.adminId, req.params.id, v.updateStaff.parse(req.body))));

exports.resetPassword = asyncHandler(async (req, res) =>
    ok(res, await service.resetStaffPassword(req.auth.adminId, req.params.id)));