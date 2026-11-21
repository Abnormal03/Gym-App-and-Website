const prisma = require('../config/prisma');
const { AppError } = require('../utils/errors');

async function getProfile(superAdminId) {
  const [profile, gyms, gymAdmins] = await Promise.all([
    prisma.superAdmin.findUnique({ where: { id: superAdminId }, select: { id: true, name: true, email: true, createdAt: true } }),
    prisma.gym.count(),
    prisma.gymAdmin.count(),
  ]);
  if (!profile) throw new AppError('NOT_FOUND', 'Platform admin not found');
  return { profile, overview: { gyms, gymAdmins } };
}

async function listRegistrations(status, page, limit) {
  const where = status ? { approvalStatus: status } : {};
  const [registrations, total] = await Promise.all([
    prisma.gym.findMany({ where, orderBy: { createdAt: 'desc' }, skip: (page - 1) * limit, take: limit,
      select: { id: true, name: true, address: true, capacity: true, createdAt: true, isActive: true, approvalStatus: true,
        admin: { select: { id: true, name: true, email: true } },
        approvalAudits: { orderBy: { createdAt: 'desc' }, take: 1, include: { superAdmin: { select: { id: true, name: true, email: true } } } },
      },
    }), prisma.gym.count({ where }),
  ]);
  return { registrations, pagination: { page, limit, total, totalPages: Math.ceil(total / limit) } };
}

async function decide(gymId, actorId, decision, reason) {
  return prisma.$transaction(async (tx) => {
    const gym = await tx.gym.findUnique({ where: { id: gymId }, select: { id: true, name: true, approvalStatus: true } });
    if (!gym) throw new AppError('NOT_FOUND', 'Gym registration not found');
    if (gym.approvalStatus !== 'PENDING') throw new AppError('ALREADY_EXISTS', 'Only pending registrations can be decided');
    const updated = await tx.gym.update({ where: { id: gymId }, data: { approvalStatus: decision }, select: { id: true, name: true, approvalStatus: true, createdAt: true } });
    const audit = await tx.gymApprovalAudit.create({ data: { gymId, superAdminId: actorId, decision, reason: reason || null }, select: { id: true, gymId: true, superAdminId: true, decision: true, reason: true, createdAt: true } });
    return { registration: updated, audit };
  });
}
module.exports = { getProfile, listRegistrations, decide };
