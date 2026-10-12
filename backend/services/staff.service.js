/** Gym staff accounts (front desk / check-in). Created and managed by the gym ADMIN of the gym. */
const prismaModule = require('../config/prisma');
const prisma = prismaModule.prisma || prismaModule;
const { AppError } = require('../utils/errors');
const { assertAdminOwnsGym, adminGymIds, toId } = require('../utils/scope');
const { hashPassword, generateTempPassword } = require('../utils/password');
const { parsePagination, paginated } = require('../utils/pagination');

/** Never return the password hash or push token. */
const toPublicStaff = (s) => ({
    id: s.id,
    gymId: s.gymId,
    gymName: s.gym ? s.gym.name : undefined,
    name: s.name,
    email: s.email,
    phone: s.phone,
    isActive: s.isActive,
    mustChangePassword: s.mustChangePassword,
    createdAt: s.createdAt,
});

/** Load a staff member and make sure the admin owns the gym they belong to. NOT_FOUND if missing, FORBIDDEN if not yours. */
async function getOwnedStaff(adminId, staffId) {
    const staff = await prisma.gymStaff.findUnique({
        where: { id: toId(staffId, 'staffId') },
        include: { gym: { select: { id: true, name: true, adminId: true } } },
    });
    if (!staff) throw new AppError('NOT_FOUND', 'Staff member not found');
    if (staff.gym.adminId !== adminId) throw new AppError('FORBIDDEN', 'This staff member is not in one of your gyms');
    return staff;
}

async function createStaff(adminId, input) {
    await assertAdminOwnsGym(adminId, input.gymId);
    if (await prisma.gymStaff.findUnique({ where: { email: input.email } })) {
        throw new AppError('ALREADY_EXISTS', 'A staff member with this email already exists');
    }

    const generated = input.password ? null : generateTempPassword();
    const staff = await prisma.gymStaff.create({
        data: {
            gymId: input.gymId,
            name: input.name,
            email: input.email,
            phone: input.phone ?? null,
            password: await hashPassword(input.password ?? generated),
            mustChangePassword: true,
        },
    });
    // The generated password is returned ONCE here; the admin hands it to the staff member.
    return { ...toPublicStaff(staff), ...(generated ? { temporaryPassword: generated } : {}) };
}

async function listStaff(adminId, query, rawPagination) {
    const gymIds = await adminGymIds(adminId);
    let where = { gymId: { in: gymIds } };
    if (query.gymId) {
        await assertAdminOwnsGym(adminId, query.gymId);
        where = { gymId: query.gymId };
    }
    if (query.isActive !== undefined) where.isActive = query.isActive;

    const pg = parsePagination(rawPagination);
    const [rows, total] = await Promise.all([
        prisma.gymStaff.findMany({
            where,
            include: { gym: { select: { id: true, name: true, adminId: true } } },
            orderBy: { createdAt: 'desc' },
            skip: pg.skip,
            take: pg.take,
        }),
        prisma.gymStaff.count({ where }),
    ]);
    return paginated(rows.map(toPublicStaff), total, pg);
}

async function getStaff(adminId, staffId) {
    return toPublicStaff(await getOwnedStaff(adminId, staffId));
}

async function updateStaff(adminId, staffId, input) {
    const staff = await getOwnedStaff(adminId, staffId);
    if (input.gymId !== undefined && input.gymId !== staff.gymId) {
        await assertAdminOwnsGym(adminId, input.gymId); // can only move staff between your own gyms
    }
    const updated = await prisma.gymStaff.update({
        where: { id: staff.id },
        data: input,
        include: { gym: { select: { id: true, name: true, adminId: true } } },
    });
    return toPublicStaff(updated);
}

/** New temporary password; the staff member must change it at next login. Returned once. */
async function resetStaffPassword(adminId, staffId) {
    const staff = await getOwnedStaff(adminId, staffId);
    const temporaryPassword = generateTempPassword();
    await prisma.gymStaff.update({
        where: { id: staff.id },
        data: { password: await hashPassword(temporaryPassword), mustChangePassword: true },
    });
    return { id: staff.id, temporaryPassword };
}

module.exports = { createStaff, listStaff, getStaff, updateStaff, resetStaffPassword };