const prismaModule = require('../config/prisma');
const prisma = prismaModule.prisma || prismaModule;
const { AppError } = require('./errors');

/** Turn a route/body value into a positive integer id, or throw VALIDATION. */
function toId(value, name = 'id') {
    const n = Number(value);
    if (!Number.isInteger(n) || n <= 0) throw new AppError('VALIDATION', `Invalid ${name}`);
    return n;
}

async function assertAdminOwnsGym(adminId, gymId) {
    const gym = await prisma.gym.findUnique({ where: { id: toId(gymId, 'gymId') }, select: { adminId: true } });
    if (!gym) throw new AppError('NOT_FOUND', 'Gym not found');
    if (gym.adminId !== adminId) throw new AppError('FORBIDDEN', 'You do not own this gym');
}

function assertStaffInGym(auth, gymId) {
    if (auth.role !== 'GYM_STAFF' || auth.gymId !== toId(gymId, 'gymId')) {
        throw new AppError('FORBIDDEN', 'This is not your gym');
    }
}

/** Provider acts on their own rows only. */
function assertProviderOwns(auth, providerId) {
    if (!auth.providerId || auth.providerId !== toId(providerId, 'providerId')) {
        throw new AppError('FORBIDDEN', 'You can only access your own data');
    }
}

/**
 * Any actor tied to a gym (admin, staff, trainer, physio) must belong to it. Use this on routes shared by several roles.
 * Members and consultants (no gym) are always refused here.
 */
async function assertGymAccess(auth, gymId) {
    const id = toId(gymId, 'gymId');
    switch (auth.role) {
        case 'GYM_ADMIN':
            return assertAdminOwnsGym(auth.adminId, id);
        case 'GYM_STAFF':
        case 'TRAINER':
        case 'PHYSIOTHERAPIST':
            if (auth.gymId !== id) throw new AppError('FORBIDDEN', 'This is not your gym');
            return undefined;
        default:
            throw new AppError('FORBIDDEN', 'You are not allowed to do this');
    }
}

/** All gym ids an admin owns (for list endpoints like payouts or providers). */
async function adminGymIds(adminId) {
    const gyms = await prisma.gym.findMany({ where: { adminId }, select: { id: true } });
    return gyms.map((g) => g.id);
}

module.exports = { toId, assertAdminOwnsGym, assertStaffInGym, assertProviderOwns, assertGymAccess, adminGymIds };