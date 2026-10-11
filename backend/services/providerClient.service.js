/**
 * "My clients" = members who currently have access to this provider.
 *  - Trainer / physio: members with an ACTIVE, not-yet-expired package purchase (one row per purchase).
 *  - Nutrition consultant: members with an ACTIVE, not-yet-expired consultation (one row per consultation, with the gym of the order).
 * Only first name-level info is shared (name, photo). Phone and email are NOT exposed: members and providers talk through chat.
 */
const prismaModule = require('../config/prisma');
const prisma = prismaModule.prisma || prismaModule;
const { parsePagination, paginated } = require('../utils/pagination');

const USER = { select: { id: true, name: true, photoUrl: true } };

async function listPackageClients(providerId, pg) {
    const now = new Date();
    // Status is flipped to EXPIRED lazily, so the date check is what really matters here.
    const where = { providerId, status: 'ACTIVE', expiresAt: { gt: now } };

    const [rows, total] = await Promise.all([
        prisma.providerPackagePurchase.findMany({
            where,
            include: {
                user: USER,
                sessions: { where: { status: { in: ['HELD', 'SCHEDULED'] } }, select: { status: true, startsAt: true } },
            },
            orderBy: { expiresAt: 'asc' }, // expiring soonest first
            skip: pg.skip,
            take: pg.take,
        }),
        prisma.providerPackagePurchase.count({ where }),
    ]);

    const items = rows.map((r) => {
        const reserved = r.sessions.length; // booked but not done yet
        const upcoming = r.sessions
            .filter((s) => s.status === 'SCHEDULED' && s.startsAt > now)
            .map((s) => s.startsAt.getTime());
        return {
            kind: 'PACKAGE',
            userId: r.user.id,
            name: r.user.name,
            photoUrl: r.user.photoUrl,
            purchaseId: r.id,
            packageName: r.packageName,
            sessionsTotal: r.sessionsTotal,
            sessionsUsed: r.sessionsUsed,
            sessionsLeft: Math.max(0, r.sessionsTotal - r.sessionsUsed - reserved), // not yet booked
            nextSessionAt: upcoming.length ? new Date(Math.min(...upcoming)) : null,
            expiresAt: r.expiresAt,
        };
    });
    return paginated(items, total, pg);
}

async function listConsultationClients(providerId, pg) {
    const now = new Date();
    const where = { consultantId: providerId, status: 'ACTIVE', expiresAt: { gt: now } };

    const [rows, total] = await Promise.all([
        prisma.consultationAccess.findMany({
            where,
            include: {
                user: USER,
                orderItem: { select: { order: { select: { gymId: true, gym: { select: { name: true } } } } } },
            },
            orderBy: { expiresAt: 'asc' },
            skip: pg.skip,
            take: pg.take,
        }),
        prisma.consultationAccess.count({ where }),
    ]);

    const items = rows.map((r) => ({
        kind: 'CONSULTATION',
        userId: r.user.id,
        name: r.user.name,
        photoUrl: r.user.photoUrl,
        consultationId: r.id,
        gymId: r.orderItem.order.gymId, // the gym that will pay this consultant's payout
        gymName: r.orderItem.order.gym.name,
        startsAt: r.startsAt,
        expiresAt: r.expiresAt,
    }));
    return paginated(items, total, pg);
}

/** auth = req.auth (role + providerId). */
async function listMyClients(auth, rawPagination) {
    const pg = parsePagination(rawPagination);
    return auth.role === 'NUTRITION_CONSULTANT'
        ? listConsultationClients(auth.providerId, pg)
        : listPackageClients(auth.providerId, pg);
}

module.exports = { listMyClients };