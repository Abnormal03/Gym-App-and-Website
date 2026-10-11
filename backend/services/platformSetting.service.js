const prisma = require("../config/prisma");

const DEFAULT_SETTINGS = {
  SESSION_MINUTES: "60",
  SESSION_CANCEL_HOURS: "2",
  NO_SHOW_USES_SESSION: "true",
  CONSULTATION_PRICE: "500",
  CONSULTATION_CHAT_DAYS: "30",
  ORDER_EXPIRY_MINUTES: "30",
  ALLOW_WALKIN_WITH_PACKAGE: "true",
};

const CACHE_TTL_MS = 60_000;
const cache = new Map();

const getSetting = async (key) => {
  if (!Object.prototype.hasOwnProperty.call(DEFAULT_SETTINGS, key)) {
    throw new Error(`Unknown platform setting: ${key}`);
  }

  const cached = cache.get(key);

  if (cached && Date.now() - cached.at < CACHE_TTL_MS) {
    return cached.value;
  }

  const row = await prisma.platformSetting.findUnique({
    where: { key },
  });

  const value = row?.value ?? DEFAULT_SETTINGS[key];

  cache.set(key, {
    value,
    at: Date.now(),
  });

  return value;
};

const getNumberSetting = async (key) => {
  const value = Number(await getSetting(key));

  if (!Number.isFinite(value)) {
    throw new Error(`Setting ${key} is not a valid number`);
  }

  return value;
};

const getBoolSetting = async (key) => {
  return (await getSetting(key)).trim().toLowerCase() === "true";
};

const clearSettingsCache = () => {
  cache.clear();
};

module.exports = {
  DEFAULT_SETTINGS,
  getSetting,
  getNumberSetting,
  getBoolSetting,
  clearSettingsCache,
};
