const prisma = require("../config/prisma");
const { allowedTransitions } = require("../config/bookingTransitions");

const {
  expireStale,
  getUsedCapacity,
  getOrderStatus,
  getValidSessionStarts,
} = require("./bookingHelpers.service");

const { getNumberSetting } = require("./platformSetting.service");
const { parseUtcInstant, toUtcDate } = require("../utils/time");
const { recordWorkout } = require("./memberStats.service");
const { awardBadges } = require("./badge.service");

const isAdmin = (role) => role === "gym_admin" || role === "platform_admin";

const isPositiveId = (value, fieldName = "ID") => {
  const id = Number(value);

  if (!Number.isInteger(id) || id <= 0) {
    throw new Error(`Invalid ${fieldName}`);
  }

  return id;
};

const validatePositiveId = isPositiveId;

/* =========================================================
   EXISTING BOOKING FUNCTIONS
   ========================================================= */

const createBooking = async ({
  userId,
  gymId,
  packageId,
  slotStart,
  slotEnd,
  headcount = 1,
}) => {
  userId = validatePositiveId(userId, "user ID");
  gymId = validatePositiveId(gymId, "gym ID");

  if (packageId === undefined || packageId === null || packageId === "") {
    packageId = null;
  } else {
    packageId = validatePositiveId(packageId, "package ID");
  }

  headcount = Number(headcount);

  if (!Number.isInteger(headcount) || headcount <= 0) {
    throw new Error("Headcount must be a positive integer");
  }

  if (!slotStart || !slotEnd) {
    throw new Error("Invalid booking date");
  }

  const start = parseUtcInstant(slotStart);
  const end = parseUtcInstant(slotEnd);

  if (Number.isNaN(start.getTime()) || Number.isNaN(end.getTime())) {
    throw new Error("Invalid booking date");
  }

  if (start <= new Date()) {
    throw new Error("Booking start must be in the future");
  }

  if (start >= end) {
    throw new Error("slotStart must be before slotEnd");
  }

  return prisma.$transaction(
    async (tx) => {
      const lockedGyms = await tx.$queryRaw`
        SELECT "id"
        FROM "Gym"
        WHERE "id" = ${gymId}
        FOR UPDATE
      `;

      if (lockedGyms.length === 0) {
        throw new Error("Gym not found");
      }

      const gym = await tx.gym.findUnique({
        where: { id: gymId },
      });

      if (!gym) {
        throw new Error("Gym not found");
      }

      if (gym.isActive === false) {
        throw new Error("Gym is not active");
      }

      await expireStale(tx, { gymId });

      if (packageId !== null) {
        const selectedPackage = await tx.package.findFirst({
          where: { id: packageId, gymId },
        });

        if (!selectedPackage) {
          throw new Error("Package not found for this gym");
        }

        if (
          selectedPackage.isActive === false ||
          selectedPackage.active === false
        ) {
          throw new Error("Package is not active");
        }
      }

      const usedCapacity = await getUsedCapacity(tx, gymId, start, end);

      const capacity = Number(gym.capacity);

      if (
        !Number.isFinite(capacity) ||
        capacity <= 0 ||
        usedCapacity + headcount > capacity
      ) {
        throw new Error("Selected slot is fully booked");
      }

      return tx.booking.create({
        data: {
          userId,
          gymId,
          packageId,
          slotStart: start,
          slotEnd: end,
          headcount,
        },
        include: {
          gym: true,
          package: true,
          payment: true,
        },
      });
    },
    { maxWait: 10000, timeout: 30000 },
  );
};

const getMyBookings = async (userId) => {
  userId = validatePositiveId(userId, "user ID");

  return prisma.booking.findMany({
    where: { userId },
    include: {
      gym: true,
      package: true,
      payment: true,
    },
    orderBy: { createdAt: "desc" },
  });
};

const getBookingById = async (id, userId, role) => {
  id = validatePositiveId(id, "booking ID");
  userId = validatePositiveId(userId, "user ID");

  const booking = await prisma.booking.findUnique({
    where: { id },
    include: {
      gym: true,
      package: true,
      payment: true,
    },
  });

  if (!booking) {
    throw new Error("Booking not found");
  }

  if (booking.userId !== userId && !isAdmin(role)) {
    throw new Error("Access denied");
  }

  return booking;
};

const changeBookingStatus = async (id, newStatus) => {
  id = validatePositiveId(id, "booking ID");

  return prisma.$transaction(async (tx) => {
    const booking = await tx.booking.findUnique({
      where: { id },
    });

    if (!booking) {
      throw new Error("Booking not found");
    }

    const allowed = allowedTransitions[booking.status];

    if (!allowed) {
      throw new Error(`Unknown current status: ${booking.status}`);
    }

    if (!allowed.includes(newStatus)) {
      throw new Error(
        `Cannot change booking from ${booking.status} to ${newStatus}`,
      );
    }

    return tx.booking.update({
      where: { id },
      data: { status: newStatus },
      include: {
        gym: true,
        package: true,
        payment: true,
      },
    });
  });
};

const cancelBooking = async (id, userId, role) => {
  id = validatePositiveId(id, "booking ID");
  userId = validatePositiveId(userId, "user ID");

  const booking = await prisma.booking.findUnique({
    where: { id },
  });

  if (!booking) {
    throw new Error("Booking not found");
  }

  if (booking.userId !== userId && !isAdmin(role)) {
    throw new Error("Access denied");
  }

  return changeBookingStatus(id, "cancelled");
};

const confirmBooking = async (id, role) => {
  if (!isAdmin(role)) {
    throw new Error("Admin access required");
  }

  return changeBookingStatus(id, "confirmed");
};

const checkInBooking = async (id, role) => {
  if (!isAdmin(role)) {
    throw new Error("Admin access required");
  }

  const bookingId = validatePositiveId(id, "booking ID");
  const today = toUtcDate(new Date());

  return prisma.$transaction(async (tx) => {
    const booking = await tx.booking.findUnique({ where: { id: bookingId } });
    if (!booking) throw new Error("Booking not found");
    if (booking.status !== "confirmed" && booking.status !== "checked_in") {
      throw new Error("Only a confirmed booking can be checked in");
    }

    const existing = await tx.checkIn.findFirst({
      where: { bookingId, localDate: today },
    });
    if (!existing) {
      await tx.checkIn.create({
        data: {
          userId: booking.userId,
          gymId: booking.gymId,
          bookingId,
          memberPackageId: booking.memberPackageId,
          localDate: today,
          guestCount: booking.headcount,
        },
      });

      if (booking.memberPackageId) {
        await tx.memberPackage.update({
          where: { id: booking.memberPackageId },
          data: { visitsUsed: { increment: 1 } },
        });
      }

      await recordWorkout(tx, booking.userId, today);
      await awardBadges(tx, { userId: booking.userId }, "CHECK_IN");
    }

    return tx.booking.findUnique({ where: { id: bookingId } });
  });
};

const getGymBookings = async (gymId) => {
  gymId = validatePositiveId(gymId, "gym ID");

  const gym = await prisma.gym.findUnique({
    where: { id: gymId },
  });

  if (!gym) {
    throw new Error("Gym not found");
  }

  return prisma.booking.findMany({
    where: { gymId },
    include: {
      user: true,
      package: true,
      payment: true,
    },
    orderBy: { createdAt: "desc" },
  });
};

const getBookingStats = async () => {
  const [
    total,
    pending,
    confirmed,
    checkedIn,
    cancelled,
    expired,
    paymentFailed,
  ] = await Promise.all([
    prisma.booking.count(),
    prisma.booking.count({ where: { status: "pending" } }),
    prisma.booking.count({ where: { status: "confirmed" } }),
    prisma.booking.count({ where: { status: "checked_in" } }),
    prisma.booking.count({ where: { status: "cancelled" } }),
    prisma.booking.count({ where: { status: "expired" } }),
    prisma.booking.count({ where: { status: "payment_failed" } }),
  ]);

  return {
    total,
    pending,
    confirmed,
    checkedIn,
    cancelled,
    expired,
    paymentFailed,
  };
};

/* =========================================================
   B4: MEMBER BOOKINGS - GET /bookings?status=
   ========================================================= */

const getMemberBookings = async (userId, status) => {
  userId = validatePositiveId(userId, "user ID");

  // Expire stale bookings and session holds before returning data.
  await expireStale(prisma);

  const where = { userId };

  if (status) {
    const allowedStatuses = [
      "pending",
      "confirmed",
      "payment_failed",
      "cancelled",
      "checked_in",
      "expired",
    ];

    if (!allowedStatuses.includes(status)) {
      throw new Error("Invalid booking status filter");
    }

    where.status = status;
  }

  const bookings = await prisma.booking.findMany({
    where,
    include: {
      gym: true,
      package: true,
      payment: true,
      order: {
        include: {
          items: {
            include: {
              provider: true,
              purchase: true,
              consultation: {
                include: {
                  consultant: true,
                },
              },
            },
          },
        },
      },
      sessions: {
        include: {
          provider: true,
        },
        orderBy: {
          startsAt: "asc",
        },
      },
    },
    orderBy: {
      createdAt: "desc",
    },
  });

  // Keep all existing booking response fields and append B4 fields.
  // getOrderStatus is async, so every booking is mapped with await (otherwise orderStatus is {}).
  return Promise.all(
    bookings.map(async (booking) => {
      const consultationItems = (booking.order?.items || [])
        .filter((item) => item.consultation)
        .map((item) => ({
          status: item.consultation.status,
          consultant: item.consultation.consultant
            ? {
                id: item.consultation.consultant.id,
                name: item.consultation.consultant.name,
              }
            : null,
          startsAt: item.consultation.startsAt,
          expiresAt: item.consultation.expiresAt,
        }));

      return {
        ...booking,
        bookingType: booking.bookingType,
        headcount: booking.headcount,
        packageName: booking.package?.name ?? null,
        orderStatus: await getOrderStatus(booking.order, booking),
        sessions: booking.sessions.map((session) => ({
          ...session,
          providerName: session.provider?.name ?? null,
        })),
        consultation: consultationItems,
      };
    }),
  );
};

/* =========================================================
   B4: CANCEL BOOKING - POST /bookings/:id/cancel
   ========================================================= */

const cancelMemberBooking = async (id, userId) => {
  id = validatePositiveId(id, "booking ID");
  userId = validatePositiveId(userId, "user ID");

  // Read settings before opening the transaction.
  const cancelHours = await getNumberSetting("SESSION_CANCEL_HOURS");

  // Phase 1: cancel the booking in the database.
  // Do not call Chapa inside the database transaction.
  const cancelledBooking = await prisma.$transaction(
    async (tx) => {
      const locked = await tx.$queryRaw`
        SELECT "id"
        FROM "Booking"
        WHERE "id" = ${id}
        FOR UPDATE
      `;

      if (locked.length === 0) {
        throw new Error("Booking not found");
      }

      const booking = await tx.booking.findUnique({
        where: { id },
        include: {
          sessions: true,
          payment: true,
          order: true,
        },
      });

      if (!booking) {
        throw new Error("Booking not found");
      }

      if (booking.userId !== userId) {
        throw new Error("Access denied");
      }

      if (!["pending", "confirmed"].includes(booking.status)) {
        throw new Error("Only pending or confirmed bookings can be cancelled");
      }

      if (new Date(booking.slotStart) <= new Date()) {
        throw new Error("Booking cannot be cancelled after its start time");
      }

      const now = new Date();

      for (const session of booking.sessions) {
        if (!["HELD", "SCHEDULED"].includes(session.status)) {
          continue;
        }

        const hoursUntilSession =
          (new Date(session.startsAt).getTime() - now.getTime()) /
          (1000 * 60 * 60);

        // Preserve the original session-credit policy.
        if (hoursUntilSession < cancelHours) {
          await tx.providerPackagePurchase.update({
            where: { id: session.purchaseId },
            data: {
              sessionsUsed: { increment: 1 },
            },
          });
        }

        await tx.trainingSession.update({
          where: { id: session.id },
          data: {
            status: "CANCELLED",
            cancelledAt: now,
          },
        });
      }

      return tx.booking.update({
        where: { id },
        data: { status: "cancelled" },
        include: {
          gym: true,
          package: true,
          payment: true,
          order: true,
          sessions: {
            include: { provider: true },
            orderBy: { startsAt: "asc" },
          },
        },
      });
    },
    {
      maxWait: 10000,
      timeout: 30000,
    },
  );

  // Phase 2: determine whether a refund is required.
  const payment = cancelledBooking.payment;

  if (!payment || payment.status !== "success") {
    return {
      ...cancelledBooking,
      refundStatus: "not_required",
      refundMessage:
        "Booking cancelled. No successful payment was found to refund.",
    };
  }

  // Record manual review if the refund cannot be confirmed.
  const markManualReview = async (note) => {
    if (cancelledBooking.order?.id) {
      await prisma.order.update({
        where: { id: cancelledBooking.order.id },
        data: {
          needsManualRefund: true,
          refundNote: note,
        },
      });
    }

    return {
      ...cancelledBooking,
      refundStatus: "manual_review",
      refundMessage: note,
    };
  };

  if (!payment.chapaTxRef) {
    return markManualReview(
      "Booking cancelled, but the successful payment has no Chapa transaction reference. Verify the payment and arrange a refund manually.",
    );
  }

  try {
    const { refundChapaTransaction } = require("./payment.service");

    const refundResponse = await refundChapaTransaction(
      payment.chapaTxRef,
      payment.amount,
    );

    // Do not assume a refund succeeded without an explicit confirmation.

    const providerStatus = String(
      refundResponse?.data?.status ?? refundResponse?.status ?? "",
    ).toLowerCase();

    if (providerStatus !== "refunded") {
      return markManualReview(
        `Booking cancelled, but refund completion is unconfirmed. Chapa status: ${
          providerStatus || "unknown"
        }. Verify the refund before attempting another.`,
      );
    }

    // Update our records only after Chapa confirms the refund.
    await prisma.$transaction(async (tx) => {
      await tx.payment.update({
        where: { id: payment.id },
        data: { status: "refunded" },
      });

      if (cancelledBooking.order?.id) {
        await tx.order.update({
          where: { id: cancelledBooking.order.id },
          data: {
            needsManualRefund: false,
            refundNote: null,
          },
        });
      }
    });

    return {
      ...cancelledBooking,
      payment: {
        ...payment,
        status: "refunded",
      },
      refundStatus: "refunded",
      refundMessage: "Booking cancelled and refund confirmed by Chapa.",
    };
  } catch (error) {
    console.error("Booking cancellation refund requires review:", {
      bookingId: id,
      paymentId: payment.id,
      message: error.message,
    });

    try {
      return await markManualReview(
        "Booking cancelled, but the refund outcome could not be confirmed. Check the Chapa transaction before attempting another refund.",
      );
    } catch (reviewError) {
      console.error("Failed to save manual refund review:", {
        bookingId: id,
        message: reviewError.message,
      });

      return {
        ...cancelledBooking,
        refundStatus: "manual_review",
        refundMessage:
          "Booking cancelled, but refund confirmation and review recording failed. An administrator must reconcile the Chapa transaction.",
      };
    }
  }
};

/* =========================================================
   B4: ADD SESSION TO BOOKING
   POST /bookings/:bookingId/sessions
   ========================================================= */

const addSessionToBooking = async (
  bookingId,
  userId,
  { purchaseId, startsAt },
) => {
  bookingId = validatePositiveId(bookingId, "booking ID");
  userId = validatePositiveId(userId, "user ID");
  purchaseId = validatePositiveId(purchaseId, "purchase ID");

  const requestedStart = startsAt ? parseUtcInstant(startsAt) : null;
  if (!requestedStart || Number.isNaN(requestedStart.getTime())) {
    throw new Error("Invalid session start time");
  }

  return prisma.$transaction(
    async (tx) => {
      const bookingLocks = await tx.$queryRaw`
        SELECT "id"
        FROM "Booking"
        WHERE "id" = ${bookingId}
        FOR UPDATE
      `;

      if (bookingLocks.length === 0) {
        throw new Error("Booking not found");
      }

      const booking = await tx.booking.findUnique({
        where: { id: bookingId },
      });

      if (!booking) {
        throw new Error("Booking not found");
      }

      if (booking.userId !== userId) {
        throw new Error("Access denied");
      }

      if (booking.status !== "confirmed") {
        throw new Error("Booking must be confirmed before adding a session");
      }

      if (new Date(booking.slotStart) <= new Date()) {
        throw new Error("Cannot add a session to a booking that has started");
      }

      await expireStale(tx);

      const purchase = await tx.providerPackagePurchase.findUnique({
        where: { id: purchaseId },
        include: {
          provider: true,
        },
      });

      if (!purchase) {
        throw new Error("Package purchase not found");
      }

      if (purchase.userId !== userId) {
        throw new Error("This package purchase does not belong to you");
      }

      if (purchase.status !== "ACTIVE") {
        throw new Error("Package purchase is not active");
      }

      if (new Date(purchase.expiresAt) <= new Date()) {
        throw new Error("Package purchase has expired");
      }

      if (!purchase.provider || !purchase.provider.isActive) {
        throw new Error("Provider is not active");
      }

      if (purchase.provider.gymId !== booking.gymId) {
        throw new Error("Provider and booking must belong to the same gym");
      }

      // Serialize reservations for this provider to reduce race conditions.
      const providerLocks = await tx.$queryRaw`
        SELECT "id"
        FROM "Provider"
        WHERE "id" = ${purchase.providerId}
        FOR UPDATE
      `;

      if (providerLocks.length === 0) {
        throw new Error("Provider not found");
      }

      // Count reservations still holding a credit.
      const reservedSessions = await tx.trainingSession.count({
        where: {
          purchaseId,
          status: { in: ["HELD", "SCHEDULED"] },
        },
      });

      const availableCredits =
        purchase.sessionsTotal - purchase.sessionsUsed - reservedSessions;

      if (availableCredits <= 0) {
        throw new Error("No sessions remaining in this package");
      }

      const validStarts = await getValidSessionStarts(
        tx,
        purchase.providerId,
        booking.slotStart,
        booking.slotEnd,
      );

      const validStart = validStarts.some(
        (start) => new Date(start).getTime() === requestedStart.getTime(),
      );

      if (!validStart) {
        throw new Error(
          "Selected session time is not available within this booking window",
        );
      }

      const sessionMinutes = await getNumberSetting("SESSION_MINUTES");
      const endsAt = new Date(
        requestedStart.getTime() + sessionMinutes * 60 * 1000,
      );

      return tx.trainingSession.create({
        data: {
          purchaseId,
          bookingId,
          providerId: purchase.providerId,
          userId,
          startsAt: requestedStart,
          endsAt,
          status: "SCHEDULED",
        },
        include: {
          provider: true,
          booking: true,
          purchase: true,
        },
      });
    },
    { maxWait: 10000, timeout: 30000 },
  );
};

/* =========================================================
   B4: GET MEMBER OR PROVIDER SESSIONS - GET /sessions
   ========================================================= */

const getSessionsForUser = async (userId, role, status) => {
  userId = validatePositiveId(userId, "user ID");

  await expireStale(prisma);

  const normalizedRole = String(role || "").toUpperCase();

  const allowedStatuses = [
    "HELD",
    "SCHEDULED",
    "COMPLETED",
    "CANCELLED",
    "NO_SHOW",
  ];

  if (status && !allowedStatuses.includes(status)) {
    throw new Error("Invalid session status filter");
  }

  const where = {};

  if (normalizedRole === "MEMBER") {
    where.userId = userId;
  } else if (
    ["PROVIDER", "TRAINER", "PHYSIOTHERAPIST"].includes(normalizedRole)
  ) {
    const provider = await prisma.provider.findUnique({
      where: { id: userId },
      select: { id: true },
    });

    if (!provider) {
      throw new Error("Provider not found");
    }

    where.providerId = provider.id;
  } else {
    throw new Error(
      "Only members, trainers, and physiotherapists can access sessions",
    );
  }

  if (status) {
    where.status = status;
  }

  return prisma.trainingSession.findMany({
    where,
    include: {
      booking: {
        include: {
          gym: true,
          package: true,
        },
      },
      provider: {
        select: {
          id: true,
          type: true,
          name: true,
          photoUrl: true,
          bio: true,
          specializations: true,
          experienceYears: true,
          certifications: true,
          ratingAvg: true,
          ratingCount: true,
        },
      },
      purchase: true,
      review: {
        select: { id: true, rating: true, comment: true, createdAt: true },
      },
      user: {
        select: {
          id: true,
          name: true,
          photoUrl: true,
        },
      },
    },
    orderBy: {
      startsAt: "asc",
    },
  });
};

module.exports = {
  // Existing functions
  createBooking,
  getMyBookings,
  getBookingById,
  cancelBooking,
  confirmBooking,
  checkInBooking,
  getGymBookings,
  getBookingStats,

  // B4 functions
  getMemberBookings,
  cancelMemberBooking,
  addSessionToBooking,
  getSessionsForUser,
};
