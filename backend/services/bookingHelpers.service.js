const DEFAULT_ORDER_EXPIRY_MINUTES = 30;

const getOrderExpiryMinutes = () => {
  const configured = Number(process.env.ORDER_EXPIRY_MINUTES);

  if (
    process.env.ORDER_EXPIRY_MINUTES !== undefined &&
    Number.isFinite(configured) &&
    configured > 0
  ) {
    return configured;
  }

  return DEFAULT_ORDER_EXPIRY_MINUTES;
};

const expireStale = async (tx, opts = {}) => {
  const now = new Date();
  const expiryCutoff = new Date(
    now.getTime() - getOrderExpiryMinutes() * 60 * 1000,
  );

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
      status: {
        in: ["pending", "confirmed", "checked_in"],
      },
    },
    _sum: {
      headcount: true,
    },
  });

  return result._sum.headcount ?? 0;
};

const getOrderStatus = (order, booking) => {
  if (!booking) {
    throw new Error("Booking is required to determine order status");
  }

  if (booking.status === "confirmed" || booking.status === "checked_in") {
    return "PAID";
  }

  if (booking.status === "cancelled") {
    return "CANCELLED";
  }

  if (booking.status === "expired") {
    return "EXPIRED";
  }

  if (booking.status === "payment_failed") {
    return "FAILED";
  }

  if (booking.status === "pending") {
    const createdAt = order?.createdAt ?? booking.createdAt;
    const expiryTime =
      new Date(createdAt).getTime() + getOrderExpiryMinutes() * 60 * 1000;

    if (Date.now() >= expiryTime) {
      return "EXPIRED";
    }

    return "PENDING";
  }

  throw new Error(`Unsupported booking status: ${booking.status}`);
};

// B2 implementation will replace these temporary stubs.
const getValidSessionStarts = async () => {
  throw new Error("getValidSessionStarts will be implemented in B2");
};

const isProviderFree = async () => {
  throw new Error("isProviderFree will be implemented in B2");
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
