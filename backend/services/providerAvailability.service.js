/**
 * Weekly availability of a trainer / physiotherapist: a set of (dayOfWeek, period) slots.
 * Periods use Addis Ababa wall time: MORNING 06-12, AFTERNOON 12-17, EVENING 17-22. dayOfWeek: 0 = Sunday.
 * Changing availability only affects NEW bookings; sessions that are already scheduled stay as they are.
 */
const prismaModule = require('../config/prisma');
const prisma = prismaModule.prisma || prismaModule;

const toSlots = (rows) => rows.map((r) => ({ dayOfWeek: r.dayOfWeek, period: r.period }));
const ORDER = [{ dayOfWeek: 'asc' }, { period: 'asc' }]; // period enum order = MORNING, AFTERNOON, EVENING

async function getMyAvailability(providerId) {
    const rows = await prisma.providerAvailability.findMany({ where: { providerId }, orderBy: ORDER });
    return { slots: toSlots(rows) };
}

/** Full replace in ONE transaction: the provider never ends up with half an old grid and half a new one. */
async function replaceMyAvailability(providerId, slots) {
    const unique = [...new Map(slots.map((s) => [`${s.dayOfWeek}-${s.period}`, s])).values()]; // silently drop duplicates

    const rows = await prisma.$transaction(async (tx) => {
        await tx.providerAvailability.deleteMany({ where: { providerId } });
        if (unique.length > 0) {
            await tx.providerAvailability.createMany({
                data: unique.map((s) => ({ providerId, dayOfWeek: s.dayOfWeek, period: s.period })),
            });
        }
        return tx.providerAvailability.findMany({ where: { providerId }, orderBy: ORDER });
    });
    return { slots: toSlots(rows) };
}

module.exports = { getMyAvailability, replaceMyAvailability };
