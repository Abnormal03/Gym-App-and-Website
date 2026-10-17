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

// The provider Clients page is a member list, so pagination and totals must
// operate on unique members rather than individual purchases/access records.
function paginateMembers(items, pg) {
    const ordered = items.sort((a, b) => new Date(a.expiresAt) - new Date(b.expiresAt));
    return paginated(ordered.slice(pg.skip, pg.skip + pg.take), ordered.length, pg);
}

async function listPackageClients(providerId, pg) {
    const now = new Date();
    // Status is flipped to EXPIRED lazily, so the date check is what really matters here.
    const where = { providerId, status: 'ACTIVE', expiresAt: { gt: now } };

    const rows = await prisma.providerPackagePurchase.findMany({
            where,
            include: {
                user: USER,
                sessions: { where: { status: { in: ['HELD', 'SCHEDULED'] } }, select: { status: true, startsAt: true } },
            },
            orderBy: { expiresAt: 'desc' },
        });

    const byMember = new Map();
    for (const row of rows) {
        if (!byMember.has(row.userId)) byMember.set(row.userId, []);
        byMember.get(row.userId).push(row);
    }

    const items = [...byMember.values()].map((purchases) => {
        const latest = purchases[0]; // ordered by expiry descending
        const packageNames = [...new Set(purchases.map((r) => r.packageName))];
        const upcoming = purchases.flatMap((r) => r.sessions
            .filter((s) => s.status === 'SCHEDULED' && s.startsAt > now)
            .map((s) => s.startsAt.getTime()));
        return {
            kind: 'PACKAGE',
            userId: latest.user.id,
            name: latest.user.name,
            photoUrl: latest.user.photoUrl,
            purchaseId: latest.id,
            purchaseIds: purchases.map((r) => r.id),
            activePackageCount: purchases.length,
            packageName: packageNames.join(', '),
            packageNames,
            sessionsTotal: purchases.reduce((sum, r) => sum + r.sessionsTotal, 0),
            sessionsUsed: purchases.reduce((sum, r) => sum + r.sessionsUsed, 0),
            sessionsLeft: purchases.reduce((sum, r) => {
                const reserved = r.sessions.length; // booked but not done yet
                return sum + Math.max(0, r.sessionsTotal - r.sessionsUsed - reserved);
            }, 0),
            nextSessionAt: upcoming.length ? new Date(Math.min(...upcoming)) : null,
            expiresAt: latest.expiresAt,
        };
    });
    return paginateMembers(items, pg);
}

async function listConsultationClients(providerId, pg) {
    const now = new Date();
    const where = { consultantId: providerId, status: 'ACTIVE', expiresAt: { gt: now } };

    const rows = await prisma.consultationAccess.findMany({
            where,
            include: {
                user: USER,
                orderItem: { select: { order: { select: { gymId: true, gym: { select: { name: true } } } } } },
            },
            orderBy: { expiresAt: 'desc' },
        });

    const byMember = new Map();
    for (const row of rows) {
        if (!byMember.has(row.userId)) byMember.set(row.userId, []);
        byMember.get(row.userId).push(row);
    }

    const items = [...byMember.values()].map((accesses) => {
        const latest = accesses[0]; // ordered by expiry descending
        const gyms = [...new Map(accesses.map((r) => [r.orderItem.order.gymId, {
            id: r.orderItem.order.gymId,
            name: r.orderItem.order.gym.name,
        }])).values()];
        return {
            kind: 'CONSULTATION',
            userId: latest.user.id,
            name: latest.user.name,
            photoUrl: latest.user.photoUrl,
            consultationId: latest.id,
            consultationIds: accesses.map((r) => r.id),
            activeConsultationCount: accesses.length,
            gymId: latest.orderItem.order.gymId,
            gymName: latest.orderItem.order.gym.name,
            gyms,
            startsAt: accesses.reduce((earliest, r) => r.startsAt < earliest ? r.startsAt : earliest, latest.startsAt),
            expiresAt: latest.expiresAt,
        };
    });
    return paginateMembers(items, pg);
}

/** auth = req.auth (role + providerId). */
async function listMyClients(auth, rawPagination) {
    const pg = parsePagination(rawPagination);
    return auth.role === 'NUTRITION_CONSULTANT'
        ? listConsultationClients(auth.providerId, pg)
        : listPackageClients(auth.providerId, pg);
}

module.exports = { listMyClients };
