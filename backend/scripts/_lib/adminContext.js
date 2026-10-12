/**
 * Shared setup for the A2 scripts: the seeded admin + his gyms, and a SECOND admin with his own gym
 * (created through Prisma) so we can prove one admin cannot touch another admin's data.
 */
const bcrypt = require('bcryptjs');
const { loginAdmin, loginStaff, getPrisma, uniq, ADMIN_EMAIL, ADMIN_PASSWORD } = require('./testkit');

async function adminContext() {
    const prisma = getPrisma();
    if (!prisma) throw new Error('Cannot load config/prisma.js from scripts/_lib (needed to find gyms and make the second admin).');

    const adminRow = await prisma.gymAdmin.findUnique({ where: { email: ADMIN_EMAIL } });
    if (!adminRow) throw new Error(`Admin ${ADMIN_EMAIL} not found. Run: npm run seed:v2`);
    const gyms = await prisma.gym.findMany({ where: { adminId: adminRow.id }, orderBy: { id: 'asc' } });
    if (gyms.length === 0) throw new Error('The seeded admin has no gyms. Run: npm run seed:v2');

    const token = await loginAdmin(ADMIN_EMAIL, ADMIN_PASSWORD, { expectedAdminId: adminRow.id });

    // second admin + gym (removed in cleanup)
    const email = `${uniq('tmp.admin')}@gym.test`;
    const otherAdmin = await prisma.gymAdmin.create({
        data: { name: 'Temp Admin', email, password: await bcrypt.hash(ADMIN_PASSWORD, 10) },
    });
    const otherGym = await prisma.gym.create({
        data: { adminId: otherAdmin.id, name: 'Temp Gym', address: 'Temp', openingTime: '06:00', closingTime: '22:00', capacity: 5, photos: [], amenities: [] },
    });
    const otherToken = await loginAdmin(email, ADMIN_PASSWORD);

    // a staff token (a valid login that is NOT an admin) to prove the role check
    const staff = await loginStaff('staff.bole@gym.test');

    return {
        prisma,
        token,
        gym1: gyms[0].id,
        gym2: gyms.length > 1 ? gyms[1].id : null,
        otherToken,
        otherGym: otherGym.id,
        staffToken: staff.token || null,
        async cleanup() {
            await prisma.gym.deleteMany({ where: { id: otherGym.id } });
            await prisma.gymAdmin.deleteMany({ where: { id: otherAdmin.id } });
        },
    };
}

module.exports = { adminContext };