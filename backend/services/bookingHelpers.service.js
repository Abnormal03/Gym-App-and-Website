const { getNumberSetting } = require("./platformSetting.service");

const {
  addisDayOfWeek,
  periodOf,
  periodOfEnd,
  addMinutes,
} = require("../utils/time");

const DEFAULT_ORDER_EXPIRY_MINUTES = 30;
const SESSION_START_INTERVAL_MINUTES = 30;

const ACTIVE_CAPACITY_STATUSES = ["pending", "confirmed", "checked_in"];

const ACTIVE_SESSION_STATUSES = ["HELD", "SCHEDULED"];

const getOrderExpiryMinutes = async () => {
  const minutes = await getNumberSetting("ORDER_EXPIRY_MINUTES");

  if (!Number.isFinite(minutes) || minutes <= 0) {
    throw new Error("ORDER_EXPIRY_MINUTES must be greater than 0");
  }

  return minutes;
};

const expireStale = async (tx, opts = {}) => {
  const now = new Date();
  const expiryMinutes = await getOrderExpiryMinutes();

  const expiryCutoff = new Date(now.getTime() - expiryMinutes * 60_000);

  const where = {
    status: "pending",
    createdAt: { lt: expiryCutoff },
  };

  if (opts.userId !== undefined) {
    where.userId = Number(opts.userId);
  }

  if (opts.gymId !== undefined) {
    where.gymId = Number(opts.gymId);
  }

  const staleBookings = await tx.booking.findMany({
    where,
    select: { id: true },
  });

  const bookingIds = staleBookings.map((booking) => booking.id);

  if (bookingIds.length === 0) {
    return { expiredCount: 0 };
  }

  await tx.booking.updateMany({
    where: {
      id: { in: bookingIds },
      status: "pending",
    },
    data: { status: "expired" },
  });

  await tx.trainingSession.updateMany({
    where: {
      bookingId: { in: bookingIds },
      status: "HELD",
    },
    data: {
      status: "CANCELLED",
      cancelledAt: now,
    },
  });

  await tx.providerPackagePurchase.updateMany({
    where: {
      status: "PENDING",
      orderItem: {
        order: {
          bookingId: { in: bookingIds },
        },
      },
    },
    data: { status: "EXPIRED" },
  });

  await tx.consultationAccess.updateMany({
    where: {
      status: "PENDING",
      orderItem: {
        order: {
          bookingId: { in: bookingIds },
        },
      },
    },
    data: { status: "EXPIRED" },
  });

  await tx.memberPackage.updateMany({
    where: {
      status: "PENDING",
      purchaseBookingId: { in: bookingIds },
    },
    data: { status: "EXPIRED" },
  });

  return { expiredCount: bookingIds.length };
};

const getUsedCapacity = async (tx, gymId, start, end) => {
  const result = await tx.booking.aggregate({
    where: {
      gymId: Number(gymId),
      slotStart: { lt: end },
      slotEnd: { gt: start },
      status: { in: ACTIVE_CAPACITY_STATUSES },
    },
    _sum: { headcount: true },
  });

  return result._sum.headcount ?? 0;
};

const getOrderStatus = async (order, booking) => {
  if (!booking) {
    throw new Error("Booking is required to determine order status");
  }

  if (booking.status === "confirmed" || booking.status === "checked_in") {
    return "PAID";
  }

  if (booking.status === "cancelled") return "CANCELLED";
  if (booking.status === "expired") return "EXPIRED";
  if (booking.status === "payment_failed") return "FAILED";

  if (booking.status === "pending") {
    const createdAt = order?.createdAt ?? booking.createdAt;
    const expiryMinutes = await getOrderExpiryMinutes();
    const expiryTime = new Date(createdAt).getTime() + expiryMinutes * 60_000;

    return Date.now() >= expiryTime ? "EXPIRED" : "PENDING";
  }

  throw new Error(`Unsupported booking status: ${booking.status}`);
};

const isProviderFree = async (tx, providerId, start, end) => {
  const startDate = new Date(start);
  const endDate = new Date(end);

  if (
    Number.isNaN(startDate.getTime()) ||
    Number.isNaN(endDate.getTime()) ||
    startDate >= endDate
  ) {
    return false;
  }

  const conflict = await tx.trainingSession.findFirst({
    where: {
      providerId: Number(providerId),
      status: { in: ACTIVE_SESSION_STATUSES },
      startsAt: { lt: endDate },
      endsAt: { gt: startDate },
    },
    select: { id: true },
  });

  return !conflict;
};

/**
 * Returns valid session start instants in UTC.
 *
 * Candidate starts are on 30-minute boundaries. A session
 * must fit inside the booking window and inside one provider
 * availability period in Addis Ababa time.
 */
const getValidSessionStarts = async (
  tx,
  providerId,
  bookingStart,
  bookingEnd,
) => {
  const start = new Date(bookingStart);
  const end = new Date(bookingEnd);

  if (
    Number.isNaN(start.getTime()) ||
    Number.isNaN(end.getTime()) ||
    start >= end
  ) {
    return [];
  }

  const sessionMinutes = await getNumberSetting("SESSION_MINUTES");

  if (!Number.isFinite(sessionMinutes) || sessionMinutes <= 0) {
    throw new Error("Invalid SESSION_MINUTES setting");
  }

  // There are at most seven weekday/period combinations per
  // provider, so reading this provider's availability is small.
  const availability = await tx.providerAvailability.findMany({
    where: {
      providerId: Number(providerId),
    },
    select: {
      dayOfWeek: true,
      period: true,
    },
  });

  const availabilityKeys = new Set(
    availability.map(({ dayOfWeek, period }) => `${dayOfWeek}:${period}`),
  );

  // Addis time is UTC+3 year-round. Since this is a whole-hour
  // offset, 30-minute boundaries align in UTC and Addis time.
  const firstCandidate = new Date(start);
  firstCandidate.setUTCSeconds(0, 0);

  const remainder =
    firstCandidate.getUTCMinutes() % SESSION_START_INTERVAL_MINUTES;

  if (remainder !== 0) {
    firstCandidate.setUTCMinutes(
      firstCandidate.getUTCMinutes() +
        SESSION_START_INTERVAL_MINUTES -
        remainder,
    );
  }

  const validStarts = [];

  for (
    let candidate = firstCandidate;
    candidate < end;
    candidate = addMinutes(candidate, SESSION_START_INTERVAL_MINUTES)
  ) {
    const sessionEnd = addMinutes(candidate, sessionMinutes);

    if (sessionEnd > end) continue;

    const day = addisDayOfWeek(candidate);
    const period = periodOf(candidate);

    if (!period) continue;

    if (!availabilityKeys.has(`${day}:${period}`)) {
      continue;
    }

    // The end is exclusive: a session ending exactly at noon
    // belongs to the morning period.
    if (periodOfEnd(sessionEnd) !== period) {
      continue;
    }

    const free = await isProviderFree(tx, providerId, candidate, sessionEnd);

    if (free) {
      validStarts.push(new Date(candidate));
    }
  }

  return validStarts;
};

module.exports = {
  DEFAULT_ORDER_EXPIRY_MINUTES,
  getOrderExpiryMinutes,
  expireStale,
  getUsedCapacity,
  getOrderStatus,
  getValidSessionStarts,
  isProviderFree,
};
