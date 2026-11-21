const { z } = require('zod');
const service = require('../services/superAdmin.service');
const { AppError } = require('../utils/errors');

const querySchema = z.object({ status: z.enum(['PENDING', 'APPROVED', 'REJECTED']).default('PENDING'), page: z.coerce.number().int().min(1).default(1), limit: z.coerce.number().int().min(1).max(100).default(25) }).strict();
const reasonSchema = z.object({ reason: z.string().trim().min(1).max(1000).optional() }).strict();
async function profile(req, res, next) { try { res.json({ success: true, ...(await service.getProfile(req.auth.superAdminId)) }); } catch(e) { next(e); } }
async function list(req, res, next) { try { const q = querySchema.parse(req.query); const data = await service.listRegistrations(q.status, q.page, q.limit); res.json({ success: true, ...data }); } catch(e) { next(e); } }
async function decide(req, res, next, decision) {
  try {
    const gymId = Number(req.params.gymId);
    if (!Number.isSafeInteger(gymId) || gymId <= 0) throw new AppError('VALIDATION', 'Invalid gym ID');
    const body = reasonSchema.parse(req.body || {});
    if (decision === 'REJECTED' && !body.reason) throw new AppError('VALIDATION', 'A reason is required to reject a gym registration');
    const data = await service.decide(gymId, req.auth.superAdminId, decision, body.reason);
    return res.json({ success: true, ...data });
  } catch(e) { next(e); }
}
const approve = (req,res,next) => decide(req,res,next,'APPROVED');
const reject = (req,res,next) => decide(req,res,next,'REJECTED');
module.exports = { profile, list, approve, reject };
