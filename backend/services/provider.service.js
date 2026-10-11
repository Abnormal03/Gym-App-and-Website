/**
 * Trainer / physiotherapist accounts, managed by the gym ADMIN of the gym they belong to.
 * Nutrition consultants are NOT managed here (they have no gym; the dev team seeds them).
 * Rule: the admin can never change a provider's type, email or gym, and never sees their password hash.
 */
const prismaModule = require('../config/prisma');
const prisma = prismaModule.prisma || prismaModule;
const { AppError } = require('../utils/errors');
const { assertAdminOwnsGym, adminGymIds, toId } = require('../utils/scope');
const { hashPassword, generateTempPassword } = require('../utils/password');
const { parsePagination, paginated } = require('../utils/pagination');

const toPublicProvider = (p) => ({
    id: p.id,
    type: p.type,
    gymId: p.gymId,
    gymName: p.gym ? p.gym.name : undefined,
    name: p.name,
    email: p.email,
    phone: p.phone,
    photoUrl: p.photoUrl,
    bio: p.bio,
    specializations: p.specializations,
    experienceYears: p.experienceYears,
    certifications: p.certifications,
    sharePercent: p.sharePercent,
    isActive: p.isActive,
    mustChangePassword: p.mustChangePassword,
    ratingAvg: p.ratingAvg,
    ratingCount: p.ratingCount,
    sessionsCompleted: p.sessionsCompleted,
    createdAt: p.createdAt,
    ...(p.availability ? { availability: p.availability } : {}),
    ...(p.packages ? { packages: p.packages } : {}),
});

const GYM_SELECT = { select: { id: true, name: true, adminId: true } };

async function getOwnedProvider(adminId, providerId, include = {}) {
    const provider = await prisma.provider.findUnique({
        where: { id: toId(providerId, 'providerId') },
        include: { gym: GYM_SELECT, ...include },
    });
    if (!provider) throw new AppError('NOT_FOUND', 'Provider not found');
    // Consultants have gym = null: they are never an admin's to manage.
    if (!provider.gym || provider.gym.adminId !== adminId) {
        throw new AppError('FORBIDDEN', 'This provider is not in one of your gyms');
    }
    return provider;
}

async function createProvider(adminId, input) {
    await assertAdminOwnsGym(adminId, input.gymId);
    if (await prisma.provider.findUnique({ where: { email: input.email } })) {
        throw new AppError('ALREADY_EXISTS', 'A provider with this email already exists');
    }

    const generated = input.password ? null : generateTempPassword();
    const provider = await prisma.provider.create({
        data: {
            type: input.type,
            gymId: input.gymId,
            name: input.name,
            email: input.email,
            phone: input.phone ?? null,
            password: await hashPassword(input.password ?? generated),
            mustChangePassword: true,
            bio: input.bio ?? null,
            specializations: input.specializations,
            experienceYears: input.experienceYears,
            certifications: input.certifications,
            sharePercent: input.sharePercent,
        },
    });
    return { ...toPublicProvider(provider), ...(generated ? { temporaryPassword: generated } : {}) };
}

async function listProviders(adminId, query, rawPagination) {
    const gymIds = await adminGymIds(adminId);
    let where = { gymId: { in: gymIds } };
    if (query.gymId) {
        await assertAdminOwnsGym(adminId, query.gymId);
        where = { gymId: query.gymId };
    }
    if (query.type) where.type = query.type;
    if (query.isActive !== undefined) where.isActive = query.isActive;

    const pg = parsePagination(rawPagination);
    const [rows, total] = await Promise.all([
        prisma.provider.findMany({
            where,
            include: { gym: GYM_SELECT },
            orderBy: { createdAt: 'desc' },
            skip: pg.skip,
            take: pg.take,
        }),
        prisma.provider.count({ where }),
    ]);
    return paginated(rows.map(toPublicProvider), total, pg);
}

/** Detail view includes availability and packages so the admin can see what the provider offers. */
async function getProvider(adminId, providerId) {
    const provider = await getOwnedProvider(adminId, providerId, { availability: true, packages: true });
    return toPublicProvider(provider);
}

/** Deactivating (isActive=false) is the soft delete: the provider can no longer log in or be booked. History is kept. */
async function updateProvider(adminId, providerId, input) {
    const provider = await getOwnedProvider(adminId, providerId);
    const updated = await prisma.provider.update({
        where: { id: provider.id },
        data: input,
        include: { gym: GYM_SELECT },
    });
    return toPublicProvider(updated);
}

async function resetProviderPassword(adminId, providerId) {
    const provider = await getOwnedProvider(adminId, providerId);
    const temporaryPassword = generateTempPassword();
    await prisma.provider.update({
        where: { id: provider.id },
        data: { password: await hashPassword(temporaryPassword), mustChangePassword: true },
    });
    return { id: provider.id, temporaryPassword };
}

module.exports = { createProvider, listProviders, getProvider, updateProvider, resetProviderPassword };