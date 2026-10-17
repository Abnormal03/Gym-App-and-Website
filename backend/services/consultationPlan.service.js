/**
 * Consultation plan service – NUTRITION_CONSULTANT only.
 *
 * A consultant can override the platform-wide consultation price and chat-day
 * defaults. Checkout must use the price of the consultant assigned to the order.
 */
const prismaModule = require('../config/prisma');
const prisma = prismaModule.prisma || prismaModule;
const { AppError } = require('../utils/errors');
const { getNumberSetting } = require('./platformSetting.service');

/**
 * Returns the effective consultation plan for a consultant:
 *   {
 *     consultationPrice: number,   // consultant override or platform default
 *     chatDays:          number,   // their override or the platform default
 *     priceIsCustom:     boolean,  // true = consultant set their own price
 *     chatDaysIsCustom:  boolean,
 *   }
 */
async function getConsultationPlan(providerId) {
    const provider = await prisma.provider.findUnique({
        where: { id: providerId },
        select: { id: true, type: true, consultationPrice: true, chatDays: true },
    });

    if (!provider) throw new AppError('NOT_FOUND', 'Provider not found');
    if (provider.type !== 'NUTRITION_CONSULTANT') {
        throw new AppError('FORBIDDEN', 'Only nutrition consultants have a consultation plan');
    }

    const [defaultPrice, defaultChatDays] = await Promise.all([
        getNumberSetting('CONSULTATION_PRICE'),
        getNumberSetting('CONSULTATION_CHAT_DAYS'),
    ]);

    return {
        consultationPrice: provider.consultationPrice !== null
            ? Number(provider.consultationPrice)
            : defaultPrice,
        chatDays: provider.chatDays ?? defaultChatDays,
        priceIsCustom: provider.consultationPrice !== null,
        chatDaysIsCustom: provider.chatDays !== null,
        platformDefaults: {
            consultationPrice: defaultPrice,
            chatDays: defaultChatDays,
        },
    };
}

/**
 * Update the consultant's price and/or chatDays. Pass null to reset a field
 * to its platform default.
 *
 * @param {number} providerId
 * @param {{ consultationPrice?: number|null, chatDays?: number|null }} input
 */
async function updateConsultationPlan(providerId, input) {
    const provider = await prisma.provider.findUnique({
        where: { id: providerId },
        select: { id: true, type: true },
    });

    if (!provider) throw new AppError('NOT_FOUND', 'Provider not found');
    if (provider.type !== 'NUTRITION_CONSULTANT') {
        throw new AppError('FORBIDDEN', 'Only nutrition consultants have a consultation plan');
    }

    const data = {};

    if ('consultationPrice' in input) {
        if (input.consultationPrice === null) {
            data.consultationPrice = null;
        } else {
            const price = Number(input.consultationPrice);
            if (!Number.isFinite(price) || price < 0) {
                throw new AppError('VALIDATION', 'consultationPrice must be a non-negative number');
            }
            data.consultationPrice = price;
        }
    }

    if ('chatDays' in input) {
        if (input.chatDays === null) {
            data.chatDays = null; // reset to platform default
        } else {
            const days = Number(input.chatDays);
            if (!Number.isInteger(days) || days < 1) {
                throw new AppError('VALIDATION', 'chatDays must be a positive integer');
            }
            data.chatDays = days;
        }
    }

    if (Object.keys(data).length === 0) {
        throw new AppError('VALIDATION', 'Provide at least one of consultationPrice or chatDays');
    }

    await prisma.provider.update({ where: { id: providerId }, data });

    return getConsultationPlan(providerId);
}

module.exports = { getConsultationPlan, updateConsultationPlan };
