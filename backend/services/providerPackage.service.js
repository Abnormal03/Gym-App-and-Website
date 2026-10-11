/**
 * A trainer's / physio's own session packages (e.g. "8 sessions, valid 60 days").
 * Editing a package never changes what members already bought: purchases keep a snapshot (name, sessions, price paid).
 * Delete = deactivate (isActive=false) so old purchases keep their link.
 */
const prismaModule = require('../config/prisma');
const prisma = prismaModule.prisma || prismaModule;
const { AppError } = require('../utils/errors');
const { toId } = require('../utils/scope');
const { parsePagination, paginated } = require('../utils/pagination');
const { toMoney } = require('../utils/money');

const toPublicPackage = (p) => ({
    id: p.id,
    name: p.name,
    description: p.description,
    sessionCount: p.sessionCount,
    price: toMoney(p.price),
    validityDays: p.validityDays,
    isActive: p.isActive,
    createdAt: p.createdAt,
});

/** NOT_FOUND if it does not exist, FORBIDDEN if it belongs to another provider. */
async function getOwnedPackage(providerId, packageId) {
    const pkg = await prisma.providerPackage.findUnique({ where: { id: toId(packageId, 'packageId') } });
    if (!pkg) throw new AppError('NOT_FOUND', 'Package not found');
    if (pkg.providerId !== providerId) throw new AppError('FORBIDDEN', 'This package is not yours');
    return pkg;
}

async function createMyPackage(providerId, input) {
    const pkg = await prisma.providerPackage.create({
        data: {
            providerId,
            name: input.name,
            description: input.description ?? null,
            sessionCount: input.sessionCount,
            price: toMoney(input.price),
            validityDays: input.validityDays,
        },
    });
    return toPublicPackage(pkg);
}

async function listMyPackages(providerId, query, rawPagination) {
    const where = { providerId };
    if (query.isActive !== undefined) where.isActive = query.isActive;

    const pg = parsePagination(rawPagination);
    const [rows, total] = await Promise.all([
        prisma.providerPackage.findMany({ where, orderBy: { createdAt: 'desc' }, skip: pg.skip, take: pg.take }),
        prisma.providerPackage.count({ where }),
    ]);
    return paginated(rows.map(toPublicPackage), total, pg);
}

async function getMyPackage(providerId, packageId) {
    return toPublicPackage(await getOwnedPackage(providerId, packageId));
}

async function updateMyPackage(providerId, packageId, input) {
    const pkg = await getOwnedPackage(providerId, packageId);
    const data = { ...input };
    if (data.price !== undefined) data.price = toMoney(data.price);
    return toPublicPackage(await prisma.providerPackage.update({ where: { id: pkg.id }, data }));
}

async function deactivateMyPackage(providerId, packageId) {
    const pkg = await getOwnedPackage(providerId, packageId);
    return toPublicPackage(await prisma.providerPackage.update({ where: { id: pkg.id }, data: { isActive: false } }));
}

module.exports = { createMyPackage, listMyPackages, getMyPackage, updateMyPackage, deactivateMyPackage };