/**
 * Gym packages = the V1 `Package` model plus the V2 restriction columns
 * (maxVisits, allowedDays, allowedPeriods, maxGroupSize). Managed by the gym ADMIN of the gym.
 * Delete = deactivate (isActive=false): old bookings and member packages keep pointing at it.
 */
const prismaModule = require('../config/prisma');
const prisma = prismaModule.prisma || prismaModule;
const { AppError } = require('../utils/errors');
const { assertAdminOwnsGym, adminGymIds, toId } = require('../utils/scope');
const { parsePagination, paginated } = require('../utils/pagination');
const { toMoney } = require('../utils/money');

const toPublicPackage = (p) => ({
    id: p.id,
    gymId: p.gymId,
    name: p.name,
    type: p.type,
    price: toMoney(p.price),
    durationDays: p.durationDays,
    benefits: p.benefits,
    maxVisits: p.maxVisits,
    allowedDays: p.allowedDays,
    allowedPeriods: p.allowedPeriods,
    maxGroupSize: p.maxGroupSize,
    isActive: p.isActive,
    createdAt: p.createdAt,
});

async function getOwnedPackage(adminId, packageId) {
    const pkg = await prisma.package.findUnique({
        where: { id: toId(packageId, 'packageId') },
        include: { gym: { select: { id: true, adminId: true } } },
    });
    if (!pkg) throw new AppError('NOT_FOUND', 'Package not found');
    if (pkg.gym.adminId !== adminId) throw new AppError('FORBIDDEN', 'This package is not in one of your gyms');
    return pkg;
}

async function createGymPackage(adminId, input) {
    await assertAdminOwnsGym(adminId, input.gymId);
    const pkg = await prisma.package.create({
        data: {
            gymId: input.gymId,
            name: input.name,
            type: input.type,
            price: toMoney(input.price),
            durationDays: input.durationDays,
            benefits: input.benefits ?? null,
            maxVisits: input.maxVisits,
            allowedDays: input.allowedDays,
            allowedPeriods: input.allowedPeriods,
            maxGroupSize: input.maxGroupSize,
        },
    });
    return toPublicPackage(pkg);
}

async function listGymPackages(adminId, query, rawPagination) {
    const gymIds = await adminGymIds(adminId);
    let where = { gymId: { in: gymIds } };
    if (query.gymId) {
        await assertAdminOwnsGym(adminId, query.gymId);
        where = { gymId: query.gymId };
    }
    if (query.isActive !== undefined) where.isActive = query.isActive;

    const pg = parsePagination(rawPagination);
    const [rows, total] = await Promise.all([
        prisma.package.findMany({ where, orderBy: { createdAt: 'desc' }, skip: pg.skip, take: pg.take }),
        prisma.package.count({ where }),
    ]);
    return paginated(rows.map(toPublicPackage), total, pg);
}

async function getGymPackage(adminId, packageId) {
    return toPublicPackage(await getOwnedPackage(adminId, packageId));
}

async function updateGymPackage(adminId, packageId, input) {
    const pkg = await getOwnedPackage(adminId, packageId);
    const data = { ...input };
    if (data.price !== undefined) data.price = toMoney(data.price);
    const updated = await prisma.package.update({ where: { id: pkg.id }, data });
    return toPublicPackage(updated);
}

async function deactivateGymPackage(adminId, packageId) {
    const pkg = await getOwnedPackage(adminId, packageId);
    const updated = await prisma.package.update({ where: { id: pkg.id }, data: { isActive: false } });
    return toPublicPackage(updated);
}

module.exports = { createGymPackage, listGymPackages, getGymPackage, updateGymPackage, deactivateGymPackage };