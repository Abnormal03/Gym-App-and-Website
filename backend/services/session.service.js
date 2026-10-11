const prismaModule = require('../config/prisma');
const prisma = prismaModule.prisma || prismaModule;
const bookingService = require('./booking.service');
const { AppError } = require('../utils/errors');
const { toId } = require('../utils/scope');
const { addHours } = require('../utils/time');
const { getBoolSetting, getNumberSetting } = require('./platformSetting.service');
const { creditSessionEarning } = require('./earning.service');
const { awardBadges } = require('./badge.service');

const getSessions = async (userId, role, status) => {
    return bookingService.getSessionsForUser(userId, role, status);
};

/** E-32: Provider marks session completed after startsAt */
const completeSession = async (auth, sessionIdParam) => {
    const sessionId = toId(sessionIdParam, 'sessionId');
    const now = new Date();

    return prisma.$transaction(async (tx) => {
        const session = await tx.trainingSession.findUnique({
            where: { id: sessionId },
            include: { purchase: true },
        });

        if (!session) throw new AppError('NOT_FOUND', 'Session not found');
        if (session.providerId !== auth.providerId) {
            throw new AppError('FORBIDDEN', 'You can only complete your own sessions');
        }
        if (session.status !== 'SCHEDULED') {
            throw new AppError('VALIDATION', 'Only scheduled sessions can be marked completed');
        }
        if (session.startsAt > now) {
            throw new AppError('VALIDATION', 'Cannot complete a session before its start time');
        }

        const updated = await tx.trainingSession.updateMany({
            where: {
                id: sessionId,
                providerId: auth.providerId,
                status: 'SCHEDULED',
                startsAt: { lte: now },
            },
            data: {
                status: 'COMPLETED',
                completedAt: now,
            },
        });

        if (updated.count === 0) {
            throw new AppError('VALIDATION', 'Session could not be completed');
        }

        await tx.providerPackagePurchase.update({
            where: { id: session.purchaseId },
            data: { sessionsUsed: { increment: 1 } },
        });

        await tx.provider.update({
            where: { id: auth.providerId },
            data: { sessionsCompleted: { increment: 1 } },
        });

        const earning = await creditSessionEarning(tx, sessionId);
        const newBadges = await awardBadges(tx, { providerId: auth.providerId }, 'SESSION_COMPLETED');

        return {
            success: true,
            sessionId,
            status: 'COMPLETED',
            completedAt: now,
            earning,
            newBadges,
        };
    });
};

/** Provider marks no-show */
const noShowSession = async (auth, sessionIdParam) => {
    const sessionId = toId(sessionIdParam, 'sessionId');
    const now = new Date();

    return prisma.$transaction(async (tx) => {
        const session = await tx.trainingSession.findUnique({
            where: { id: sessionId },
            include: { purchase: true },
        });

        if (!session) throw new AppError('NOT_FOUND', 'Session not found');
        if (session.providerId !== auth.providerId) {
            throw new AppError('FORBIDDEN', 'You can only manage your own sessions');
        }
        if (session.status !== 'SCHEDULED') {
            throw new AppError('VALIDATION', 'Only scheduled sessions can be marked as no-show');
        }
        if (session.startsAt > now) {
            throw new AppError('VALIDATION', 'Cannot mark no-show before the session starts');
        }

        await tx.trainingSession.update({
            where: { id: sessionId },
            data: { status: 'NO_SHOW' },
        });

        const consumes = await getBoolSetting('NO_SHOW_USES_SESSION');
        if (consumes) {
            await tx.providerPackagePurchase.update({
                where: { id: session.purchaseId },
                data: { sessionsUsed: { increment: 1 } },
            });
        }

        return {
            success: true,
            sessionId,
            status: 'NO_SHOW',
            consumed: consumes,
        };
    });
};

/** E-33: Member or provider cancels session */
const cancelSession = async (auth, sessionIdParam) => {
    const sessionId = toId(sessionIdParam, 'sessionId');
    const now = new Date();

    return prisma.$transaction(async (tx) => {
        const session = await tx.trainingSession.findUnique({
            where: { id: sessionId },
            include: { purchase: true },
        });

        if (!session) throw new AppError('NOT_FOUND', 'Session not found');

        const isMember = auth.role === 'MEMBER';
        const isProvider = ['TRAINER', 'PHYSIOTHERAPIST'].includes(auth.role);

        if (isMember && session.userId !== auth.userId) {
            throw new AppError('FORBIDDEN', 'You do not own this session');
        }
        if (isProvider && session.providerId !== auth.providerId) {
            throw new AppError('FORBIDDEN', 'You do not own this session');
        }
        if (!isMember && !isProvider) {
            throw new AppError('FORBIDDEN', 'Unauthorized to cancel session');
        }

        if (!['SCHEDULED', 'HELD'].includes(session.status)) {
            throw new AppError('VALIDATION', 'Only scheduled or held sessions can be cancelled');
        }

        let consumed = false;
        if (isMember) {
            const cancelHours = await getNumberSetting('SESSION_CANCEL_HOURS');
            const cutoff = addHours(now, cancelHours);

            if (session.startsAt < cutoff) {
                // Late cancellation (< cancelHours before start): consumed
                consumed = true;
                await tx.providerPackagePurchase.update({
                    where: { id: session.purchaseId },
                    data: { sessionsUsed: { increment: 1 } },
                });
            }
        }

        await tx.trainingSession.update({
            where: { id: sessionId },
            data: {
                status: 'CANCELLED',
                cancelledAt: now,
            },
        });

        return {
            success: true,
            sessionId,
            status: 'CANCELLED',
            consumed,
        };
    });
};

module.exports = {
    getSessions,
    completeSession,
    noShowSession,
    cancelSession,
};
