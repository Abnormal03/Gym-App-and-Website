import prisma from "./prisma.js"; // <-- adjust to where V1 exports its PrismaClient

/**
 * Rules that can change without a deploy live in the PlatformSetting table.
 * This file is the single source of truth for their defaults: if a row is missing, the default below is used,
 * and the seed script inserts these rows.
 */
export const DEFAULT_SETTINGS = {
    SESSION_MINUTES: { value: '60', description: 'Length of a private session in minutes' },
    SESSION_CANCEL_HOURS: { value: '2', description: 'Member cancels at least this many hours before a session to get it back' },
    NO_SHOW_USES_SESSION: { value: 'true', description: 'A no-show consumes the session' },
    CONSULTATION_PRICE: { value: '500', description: 'ETB. One price for every nutrition consultation (consultant is assigned randomly)' },
    CONSULTATION_CHAT_DAYS: { value: '30', description: 'Days the member can chat with the consultant after paying' },
    ORDER_EXPIRY_MINUTES: { value: '30', description: 'Unpaid bookings expire after this many minutes' },
    ALLOW_WALKIN_WITH_PACKAGE: { value: 'true', description: 'A member with an active package may enter without a booking if capacity allows' },
};

const CACHE_TTL_MS = 60_000;
const cache = new Map();

/** Raw string value. Reads the DB (cached for 60 s), falls back to the default when the row is missing. */
export async function getSetting(key) {
    const hit = cache.get(key);
    if (hit && Date.now() - hit.at < CACHE_TTL_MS) return hit.value;

    const row = await prisma.platformSetting.findUnique({ where: { key } });
    const value = row?.value ?? DEFAULT_SETTINGS[key].value;
    cache.set(key, { value, at: Date.now() });
    return value;
}

export async function getNumberSetting(key) {
    if (!key.trim()) return;
    const n = Number(await getSetting(key));
    if (!Number.isFinite(n)) throw new Error(`Setting ${key} is not a number`);
    return n;
}

export async function getBoolSetting(key) {
    return (await getSetting(key)).trim().toLowerCase() === 'true';
}

/** Call after changing a setting (or in tests) so the next read hits the DB. */
export function clearSettingsCache() {
    cache.clear();
}
