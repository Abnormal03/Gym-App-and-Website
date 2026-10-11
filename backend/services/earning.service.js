/**
 * Earnings ledger: the platform only RECORDS what a provider has earned; the gym admin pays outside the app.
 * Both functions take `tx` (a Prisma transaction client) so they join the caller's transaction.
 */
const { AppError } = require('../utils/errors');
const { percentOf, sessionEarnings } = require('../utils/money');

/**
 * Credit the provider for ONE completed session of a package. Safe to call twice (second call returns the same row).
 *
 * Amount = package price x provider.sharePercent, split across the package's sessions so the total is exact:
 * every session gets an equal share and the LAST one gets the rounding remainder.
 *   Example: 1000 ETB, 3 sessions, 100%  ->  333.33, 333.33, 333.34
 *
 * CALLER RULES (A5 "complete session"): set the session to COMPLETED with a conditional update first, e.g.
 *   tx.trainingSession.updateMany({ where: { id, status: 'SCHEDULED' }, data: { status: 'COMPLETED', completedAt } })
 * and continue only if count === 1. That is what stops two simultaneous requests from crediting twice.
 */
async function creditSessionEarning(tx, sessionId) {
    const existing = await tx.earning.findUnique({ where: { sessionId } });
    if (existing) return existing;

    const session = await tx.trainingSession.findUnique({
        where: { id: sessionId },
        include: {
            purchase: true,
            provider: { select: { id: true, gymId: true, sharePercent: true } },
        },
    });
    if (!session) throw new AppError('NOT_FOUND', 'Session not found');
    if (session.status !== 'COMPLETED') throw new AppError('VALIDATION', 'Only completed sessions earn money');
    if (session.provider.gymId == null) throw new AppError('VALIDATION', 'Provider has no gym to be paid by');

    const { purchase } = session;
    // How many sessions of this package were already credited = this session's position (0-based).
    const alreadyCredited = await tx.earning.count({
        where: { orderItemId: purchase.orderItemId, sessionId: { not: null } },
    });
    const amounts = sessionEarnings(purchase.pricePaid, purchase.sessionsTotal, session.provider.sharePercent);
    if (alreadyCredited >= amounts.length) {
        throw new AppError('VALIDATION', 'All sessions of this package were already credited');
    }

    return tx.earning.create({
        data: {
            providerId: session.provider.id,
            gymId: session.provider.gymId,
            orderItemId: purchase.orderItemId,
            sessionId,
            amount: amounts[alreadyCredited],
            status: 'AVAILABLE',
        },
    });
}

/**
 * Credit a nutrition consultant for ONE paid consultation (called when the consultant is assigned, at payment).
 * Amount = item amount x consultant.sharePercent. The gym that gets the payout request is the gym of the ORDER,
 * because consultants belong to no gym. Safe to call twice.
 */
async function creditConsultationEarning(tx, orderItemId, providerId) {
    const existing = await tx.earning.findFirst({ where: { orderItemId, sessionId: null } });
    if (existing) {
        // Already credited. Same consultant = fine (idempotent). A different one means a bug in the caller.
        if (existing.providerId !== providerId) {
            throw new AppError('VALIDATION', 'This consultation was already credited to another consultant');
        }
        return existing;
    }

    const item = await tx.orderItem.findUnique({
        where: { id: orderItemId },
        include: { order: { select: { gymId: true } } },
    });
    if (!item) throw new AppError('NOT_FOUND', 'Order item not found');
    if (item.type !== 'CONSULTATION') throw new AppError('VALIDATION', 'Not a consultation item');

    const provider = await tx.provider.findUnique({
        where: { id: providerId },
        select: { id: true, type: true, sharePercent: true },
    });
    if (!provider) throw new AppError('NOT_FOUND', 'Consultant not found');
    if (provider.type !== 'NUTRITION_CONSULTANT') throw new AppError('VALIDATION', 'Provider is not a consultant');

    return tx.earning.create({
        data: {
            providerId: provider.id,
            gymId: item.order.gymId,
            orderItemId,
            sessionId: null,
            amount: percentOf(item.amount, provider.sharePercent),
            status: 'AVAILABLE',
        },
    });
}

module.exports = { creditSessionEarning, creditConsultationEarning };