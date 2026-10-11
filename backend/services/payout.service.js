const prismaModule = require('../config/prisma');
const prisma = prismaModule.prisma || prismaModule;
const { AppError } = require('../utils/errors');
const { toId, adminGymIds, assertAdminOwnsGym } = require('../utils/scope');
const { toMoney } = require('../utils/money');

/** E-45: Provider earnings summary per gym + ledger */
const getMyEarnings = async (auth) => {
    const providerId = auth.providerId;

    const earnings = await prisma.earning.findMany({
        where: { providerId },
        include: {
            gym: { select: { id: true, name: true } },
            session: { select: { id: true, startsAt: true } },
        },
        orderBy: { createdAt: 'desc' },
    });

    const gymMap = new Map();

    for (const e of earnings) {
        if (!gymMap.has(e.gymId)) {
            gymMap.set(e.gymId, {
                gymId: e.gymId,
                gymName: e.gym?.name || 'Unknown Gym',
                available: 0,
                requested: 0,
                paid: 0,
            });
        }
        const b = gymMap.get(e.gymId);
        const amount = Number(e.amount);
        if (e.status === 'AVAILABLE') b.available = toMoney(b.available + amount);
        else if (e.status === 'REQUESTED') b.requested = toMoney(b.requested + amount);
        else if (e.status === 'PAID') b.paid = toMoney(b.paid + amount);
    }

    const balances = Array.from(gymMap.values());

    const ledger = earnings.map((e) => ({
        id: e.id,
        amount: Number(e.amount),
        status: e.status,
        gymId: e.gymId,
        gymName: e.gym?.name || null,
        sessionId: e.sessionId,
        orderItemId: e.orderItemId,
        payoutRequestId: e.payoutRequestId,
        createdAt: e.createdAt,
    }));

    return { balances, ledger };
};

/** E-46: Provider requests payout of ALL available earnings for a gym */
const requestPayout = async (auth, gymIdParam) => {
    const gymId = toId(gymIdParam, 'gymId');
    const providerId = auth.providerId;

    return prisma.$transaction(async (tx) => {
        // Lock provider row
        await tx.$queryRaw`
            SELECT "id" FROM "Provider" WHERE "id" = ${providerId} FOR UPDATE
        `;

        const available = await tx.earning.findMany({
            where: {
                providerId,
                gymId,
                status: 'AVAILABLE',
            },
        });

        if (available.length === 0) {
            throw new AppError('BALANCE_TOO_LOW', 'No available earnings for payout at this gym');
        }

        const sum = available.reduce((acc, e) => acc + Number(e.amount), 0);
        const totalAmount = toMoney(sum);

        if (totalAmount <= 0) {
            throw new AppError('BALANCE_TOO_LOW', 'No available earnings for payout at this gym');
        }

        const payoutRequest = await tx.payoutRequest.create({
            data: {
                providerId,
                gymId,
                amount: totalAmount,
                status: 'PENDING',
            },
        });

        await tx.earning.updateMany({
            where: {
                id: { in: available.map((e) => e.id) },
            },
            data: {
                status: 'REQUESTED',
                payoutRequestId: payoutRequest.id,
            },
        });

        return payoutRequest;
    });
};

/** E-47: Provider payout history */
const getMyPayouts = async (auth) => {
    const providerId = auth.providerId;

    return prisma.payoutRequest.findMany({
        where: { providerId },
        include: {
            gym: { select: { id: true, name: true } },
        },
        orderBy: { createdAt: 'desc' },
    });
};

/** E-62: Admin lists payout requests across owned gyms */
const getAdminPayouts = async (auth, { status, gymId }) => {
    const ownedGymIds = await adminGymIds(auth.adminId);
    if (ownedGymIds.length === 0) return [];

    let targetGymIds = ownedGymIds;
    if (gymId) {
        const id = toId(gymId, 'gymId');
        await assertAdminOwnsGym(auth.adminId, id);
        targetGymIds = [id];
    }

    const where = {
        gymId: { in: targetGymIds },
    };

    if (status) {
        const validStatuses = ['PENDING', 'PAID', 'REJECTED'];
        if (!validStatuses.includes(status)) {
            throw new AppError('VALIDATION', `Invalid status ${status}`);
        }
        where.status = status;
    }

    return prisma.payoutRequest.findMany({
        where,
        include: {
            provider: {
                select: {
                    id: true,
                    name: true,
                    type: true,
                    email: true,
                    phone: true,
                    sharePercent: true,
                },
            },
            gym: { select: { id: true, name: true } },
        },
        orderBy: { createdAt: 'desc' },
    });
};

/** E-63: Admin marks payout request paid */
const markPayoutPaid = async (auth, payoutIdParam, { method, reference }) => {
    const payoutRequestId = toId(payoutIdParam, 'payoutRequestId');

    const validMethods = ['CASH', 'BANK_TRANSFER', 'OTHER'];
    const chosenMethod = method && validMethods.includes(method) ? method : 'OTHER';

    return prisma.$transaction(async (tx) => {
        const rows = await tx.$queryRaw`
            SELECT "id", "gymId", "status" FROM "PayoutRequest"
            WHERE "id" = ${payoutRequestId}
            FOR UPDATE
        `;
        const locked = rows[0];

        if (!locked) throw new AppError('NOT_FOUND', 'Payout request not found');

        const gym = await tx.gym.findUnique({
            where: { id: locked.gymId },
            select: { adminId: true },
        });
        if (!gym || gym.adminId !== auth.adminId) {
            throw new AppError('FORBIDDEN', 'You do not own this gym');
        }

        if (locked.status !== 'PENDING') {
            throw new AppError('VALIDATION', 'Only pending payout requests can be marked as paid');
        }

        const updated = await tx.payoutRequest.update({
            where: { id: payoutRequestId },
            data: {
                status: 'PAID',
                paidMethod: chosenMethod,
                paidReference: reference || null,
                decidedAt: new Date(),
                decidedByAdminId: auth.adminId,
            },
        });

        await tx.earning.updateMany({
            where: { payoutRequestId },
            data: { status: 'PAID' },
        });

        return updated;
    });
};

/** E-64: Admin rejects payout request */
const rejectPayout = async (auth, payoutIdParam, { note }) => {
    const payoutRequestId = toId(payoutIdParam, 'payoutRequestId');

    return prisma.$transaction(async (tx) => {
        const rows = await tx.$queryRaw`
            SELECT "id", "gymId", "status" FROM "PayoutRequest"
            WHERE "id" = ${payoutRequestId}
            FOR UPDATE
        `;
        const locked = rows[0];

        if (!locked) throw new AppError('NOT_FOUND', 'Payout request not found');

        const gym = await tx.gym.findUnique({
            where: { id: locked.gymId },
            select: { adminId: true },
        });
        if (!gym || gym.adminId !== auth.adminId) {
            throw new AppError('FORBIDDEN', 'You do not own this gym');
        }

        if (locked.status !== 'PENDING') {
            throw new AppError('VALIDATION', 'Only pending payout requests can be rejected');
        }

        const updated = await tx.payoutRequest.update({
            where: { id: payoutRequestId },
            data: {
                status: 'REJECTED',
                note: note || null,
                decidedAt: new Date(),
                decidedByAdminId: auth.adminId,
            },
        });

        await tx.earning.updateMany({
            where: { payoutRequestId },
            data: {
                status: 'AVAILABLE',
                payoutRequestId: null,
            },
        });

        return updated;
    });
};

module.exports = {
    getMyEarnings,
    requestPayout,
    getMyPayouts,
    getAdminPayouts,
    markPayoutPaid,
    rejectPayout,
};
