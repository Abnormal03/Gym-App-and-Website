/**
 * Money helpers (ETB).
 *  - New V2 columns are Prisma Decimal(12,2). Prisma accepts plain numbers when WRITING a Decimal, so pass toMoney(x).
 *  - V1 columns (Package.price, Payment.amount) are Float. Always round through toMoney() when crossing between the two.
 *  - When READING a Decimal, convert with toMoney(decimal) (it accepts anything with toString()).
 */

/** Round to 2 decimals using explicit half-up decimal rounding; 10.075 -> 10.08, 10.045 -> 10.05. */
const ROUND_HALF_UP = 'HALF_UP';

const roundHalfUpToCents = (cents, thirdDecimalDigit, mode = ROUND_HALF_UP) => {
    if (mode !== ROUND_HALF_UP) throw new Error(`Unsupported rounding mode: ${mode}`);
    return thirdDecimalDigit >= '5' ? cents + 1n : cents;
};

function toMoney(value) {
    const n = typeof value === 'number' ? value : Number(value.toString());
    if (!Number.isFinite(n)) throw new Error(`Invalid money value: ${String(value)}`);

    const sign = n < 0 ? -1n : 1n;
    const absString = Math.abs(n).toLocaleString('en-US', {
        useGrouping: false,
        maximumFractionDigits: 20,
    });
    const [wholePart = '0', fractionPart = ''] = absString.split('.');
    const digits = (fractionPart + '000000000000').slice(0, 12);
    const cents = BigInt(wholePart || '0') * 100n + BigInt((digits.slice(0, 2) || '00').padEnd(2, '0'));
    const roundedCents = roundHalfUpToCents(cents, digits[2] ?? '0', ROUND_HALF_UP);
    return Number(sign * roundedCents) / 100;
}

const toCents = (value) => Math.round(toMoney(value) * 100);
const fromCents = (cents) => cents / 100;

/** amount x percent / 100, rounded. Example: percentOf(1200, 70) = 840. */
const percentOf = (amount, percent) => toMoney((toMoney(amount) * percent) / 100);

/**
 * Split a total into `parts` amounts that add up EXACTLY to the total.
 * The first parts-1 are equal (rounded down to a cent); the LAST one gets the remainder.
 * Example: splitAmount(1000, 3) -> [333.33, 333.33, 333.34]
 */
function splitAmount(total, parts) {
    if (!Number.isInteger(parts) || parts < 1) throw new Error('parts must be a positive integer');
    const cents = toCents(total);
    const base = Math.floor(cents / parts);
    const result = Array(parts - 1).fill(base);
    result.push(cents - base * (parts - 1));
    return result.map(fromCents);
}

/**
 * What the provider earns for each session of a package (used by creditSessionEarning).
 * Apply the share to the whole package first, then split, so no cent is lost.
 * Example: sessionEarnings(1200, 4, 100) -> [300, 300, 300, 300]
 */
function sessionEarnings(pricePaid, sessionsTotal, sharePercent) {
    return splitAmount(percentOf(pricePaid, sharePercent), sessionsTotal);
}

module.exports = {
    toMoney,
    toCents,
    fromCents,
    percentOf,
    splitAmount,
    sessionEarnings,
};
