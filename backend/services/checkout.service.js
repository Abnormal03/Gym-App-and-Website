const crypto = require("crypto");
const prisma = require("../config/prisma");

const { initializePayment, confirmFreeCheckout } = require("./payment.service");

const {
  expireStale,
  getUsedCapacity,
  getOrderExpiryMinutes,
  getValidSessionStarts,
} = require("./bookingHelpers.service");

const { getNumberSetting } = require("./platformSetting.service");

const {
  addMinutes,
  addDays,
  addisDayOfWeek,
  parseUtcInstant,
  addisPeriodOf,
  addisPeriodOfEnd,
  isWithinGymOpeningHours,
} = require("../utils/time");

const validateId = (value, name) => {
  const id = Number(value);

  if (!Number.isInteger(id) || id <= 0) {
    throw new Error(`Invalid ${name}`);
  }

  return id;
};

const money = (value) => {
  const amount = Number(value);

  if (!Number.isFinite(amount) || amount < 0) {
    throw new Error("Invalid item price");
  }

  return amount.toFixed(2);
};

const isValidDate = (value) =>
  value instanceof Date && Number.isFinite(value.getTime());

const consultationContext = (input) =>
  crypto
    .createHash("sha256")
    .update(
      JSON.stringify({
        userId: input.userId,
        gymId: input.gymId,
        packageId: input.packageId,
        bookingType: input.bookingType,
        headcount: input.headcount,
        durationMinutes: input.durationMinutes,
        startsAt: input.start.toISOString(),
        provider: input.provider
          ? {
              providerId: input.provider.providerId,
              providerPackageId: input.provider.providerPackageId,
              firstSessionStartsAt: input.provider.sessionStart.toISOString(),
            }
          : null,
      }),
    )
    .digest("hex");

const signConsultationAssignment = (input, consultant, price) => {
  if (!process.env.JWT_SECRET) {
    throw new Error("JWT_SECRET is required to create a consultation quote");
  }

  const payload = Buffer.from(
    JSON.stringify({
      userId: input.userId,
      consultantId: consultant.id,
      consultationPrice: Number(price),
      context: consultationContext(input),
      expiresAt: Date.now() + 15 * 60 * 1000,
    }),
  ).toString("base64url");
  const signature = crypto
    .createHmac("sha256", process.env.JWT_SECRET)
    .update(payload)
    .digest("base64url");

  return `${payload}.${signature}`;
};

const verifyConsultationAssignment = (input, token) => {
  if (!process.env.JWT_SECRET || typeof token !== "string") {
    throw new Error("A valid consultation quote is required");
  }

  const [payload, signature, extra] = token.split(".");
  if (!payload || !signature || extra) {
    throw new Error("A valid consultation quote is required");
  }

  const expected = crypto
    .createHmac("sha256", process.env.JWT_SECRET)
    .update(payload)
    .digest();
  let received;
  try {
    received = Buffer.from(signature, "base64url");
  } catch {
    throw new Error("A valid consultation quote is required");
  }

  if (
    received.length !== expected.length ||
    !crypto.timingSafeEqual(received, expected)
  ) {
    throw new Error("A valid consultation quote is required");
  }

  let claims;
  try {
    claims = JSON.parse(Buffer.from(payload, "base64url").toString("utf8"));
  } catch {
    throw new Error("A valid consultation quote is required");
  }

  if (
    claims.userId !== input.userId ||
    claims.context !== consultationContext(input) ||
    !Number.isInteger(claims.consultantId) ||
    !Number.isFinite(claims.consultationPrice) ||
    claims.expiresAt <= Date.now()
  ) {
    throw new Error("Consultation quote expired or does not match this booking");
  }

  return claims;
};

// --------------------------------------------------
// GYM OPENING HOURS
// --------------------------------------------------

const validateGymOpeningHours = (gym, start, end) => {
  if (
    !isWithinGymOpeningHours(
      start,
      end,
      gym.openingTime,
      gym.closingTime,
    )
  ) {
    console.log("Start: ", start)
    console.log("end ", end)
    console.log("gym Start ", gym?.openingTime)
    console.log("gym End ", gym?.closingTime)
    throw new Error("OUTSIDE_GYM_OPENING_HOURS");
  }
};

// --------------------------------------------------
// PACKAGE RESTRICTIONS
// --------------------------------------------------

const assertPackageRestrictions = (gymPackage, start, end) => {
  const allowedDays = gymPackage.allowedDays || [];
  const allowedPeriods = gymPackage.allowedPeriods || [];

  if (allowedDays.length > 0 && !allowedDays.includes(addisDayOfWeek(start))) {
    throw new Error("PACKAGE_RESTRICTED");
  }

  if (allowedPeriods.length > 0) {
    const startPeriod = addisPeriodOf(start);
    const endPeriod = addisPeriodOfEnd(end);

    if (
      !startPeriod ||
      !endPeriod ||
      !allowedPeriods.includes(startPeriod) ||
      !allowedPeriods.includes(endPeriod)
    ) {
      throw new Error("PACKAGE_RESTRICTED");
    }
  }
};

// --------------------------------------------------
// INPUT VALIDATION
// --------------------------------------------------

const validateInput = (request) => {
  if (!request || typeof request !== "object" || Array.isArray(request)) {
    throw new Error("Invalid checkout request");
  }

  const {
    userId,
    gymId,
    packageId,
    bookingType = "SINGLE",
    headcount = 1,
    startsAt,
    durationMinutes,
    provider,
    consultation,
  } = request;

  if (!startsAt) {
    throw new Error("Booking start time is required");
  }

  const start = parseUtcInstant(startsAt);

  if (!isValidDate(start) || start <= new Date()) {
    throw new Error("Invalid booking date or time");
  }

  const input = {
    userId: validateId(userId, "user ID"),
    gymId: validateId(gymId, "gym ID"),
    packageId: validateId(packageId, "package ID"),
    bookingType,
    headcount: Number(headcount),
    durationMinutes: Number(durationMinutes),
    start,
    provider: provider ?? null,
    consultation: consultation == null ? null : { ...consultation },
  };

  if (!["SINGLE", "GROUP"].includes(input.bookingType)) {
    throw new Error("Invalid booking type");
  }

  if (
    !Number.isInteger(input.headcount) ||
    (input.bookingType === "SINGLE" && input.headcount !== 1) ||
    (input.bookingType === "GROUP" && input.headcount < 2)
  ) {
    throw new Error("Invalid headcount for booking type");
  }

  if (
    !Number.isInteger(input.durationMinutes) ||
    input.durationMinutes <= 0 ||
    input.durationMinutes > 240
  ) {
    throw new Error("Invalid booking duration");
  }

  input.end = addMinutes(input.start, input.durationMinutes);

  if (!isValidDate(input.end) || input.end <= input.start) {
    throw new Error("Invalid booking end time");
  }

  // Validate the optional provider selection.
  if (input.provider !== null) {
    if (typeof input.provider !== "object" || Array.isArray(input.provider)) {
      throw new Error("Invalid provider selection");
    }

    input.provider = {
      providerId: validateId(input.provider.providerId, "provider ID"),
      providerPackageId: validateId(
        input.provider.providerPackageId,
        "provider package ID",
      ),
      firstSessionStartsAt: input.provider.firstSessionStartsAt,
    };

    if (!input.provider.firstSessionStartsAt) {
      throw new Error("firstSessionStartsAt is required");
    }

    input.provider.sessionStart = parseUtcInstant(
      input.provider.firstSessionStartsAt,
    );

    if (
      !isValidDate(input.provider.sessionStart) ||
      input.provider.sessionStart <= new Date()
    ) {
      throw new Error("Invalid provider session time");
    }
  }

  // Validate the optional consultation selection.
  if (input.consultation !== null) {
    if (
      typeof input.consultation !== "object" ||
      Array.isArray(input.consultation)
    ) {
      throw new Error("Invalid consultation selection");
    }

    if ("consultationPrice" in input.consultation) {
      throw new Error("Consultation price is assigned by the server");
    }

    if (input.consultation.consultantId !== undefined) {
      input.consultation.consultantId = validateId(
        input.consultation.consultantId,
        "consultant ID",
      );
    }

    if (
      input.consultation.assignmentToken != null &&
      typeof input.consultation.assignmentToken !== "string"
    ) {
      throw new Error("Invalid consultation assignment token");
    }
  }

  return input;
};

// --------------------------------------------------
// MEMBERSHIP COVERAGE
// --------------------------------------------------

const findCoveredMemberPackage = async (tx, input, gymPackage) => {
  // Daily packages must always be paid for.
  if (gymPackage.type === "daily") {
    return null;
  }

  const now = new Date();

  const memberships = await tx.memberPackage.findMany({
    where: {
      userId: input.userId,
      gymId: input.gymId,
      status: "ACTIVE",
      startsAt: { lte: input.start },
      endsAt: { gt: input.start },
    },
    include: {
      package: true,
      purchaseBooking: {
        select: {
          status: true,
          payment: { select: { status: true } },
          order: { select: { totalAmount: true } },
        },
      },
    },
    orderBy: {
      endsAt: "asc",
    },
  });

  for (const membership of memberships) {
    // Only an entitlement for the exact selected package can cover this booking.
    // Another active package at the same gym must not make this package free.
    if (membership.packageId !== gymPackage.id) {
      continue;
    }

    // Only a completed purchase can cover a new checkout. The entitlement
    // status can outlive its source booking if that booking was later cancelled.
    const purchaseBooking = membership.purchaseBooking;
    const sourceBookingIsValid =
      purchaseBooking &&
      ["confirmed", "checked_in"].includes(purchaseBooking.status);
    const sourcePurchaseWasPaid =
      purchaseBooking?.payment?.status === "success" ||
      Number(purchaseBooking?.order?.totalAmount) === 0;
    if (!sourceBookingIsValid || !sourcePurchaseWasPaid) {
      continue;
    }

    // Skip a membership whose visit limit has already been reached.
    if (
      membership.maxVisits !== null &&
      membership.visitsUsed >= membership.maxVisits
    ) {
      continue;
    }
    // Include future reservations that have not yet consumed a visit.
    const futureBookings = await tx.booking.count({
      where: {
        userId: input.userId,
        memberPackageId: membership.id,
        status: {
          in: ["pending", "confirmed", "checked_in"],
        },
        slotStart: { gte: now },
      },
    });

    if (
      membership.maxVisits !== null &&
      membership.visitsUsed + futureBookings >= membership.maxVisits
    ) {
      continue;
    }

    // The membership must permit this booking's day and time.
    assertPackageRestrictions(membership.package, input.start, input.end);

    return membership;
  }

  return null;
};

// --------------------------------------------------
// PROVIDER VALIDATION
// --------------------------------------------------

const validateProvider = async (tx, input) => {
  if (!input.provider) {
    return null;
  }

  const provider = await tx.provider.findFirst({
    where: {
      id: input.provider.providerId,
      gymId: input.gymId,
      isActive: true,
      type: {
        in: ["TRAINER", "PHYSIOTHERAPIST"],
      },
    },
  });

  if (!provider) {
    throw new Error("PROVIDER_UNAVAILABLE");
  }

  const providerPackage = await tx.providerPackage.findFirst({
    where: {
      id: input.provider.providerPackageId,
      providerId: provider.id,
      isActive: true,
    },
  });

  if (!providerPackage) {
    throw new Error("PROVIDER_UNAVAILABLE");
  }

  const sessionMinutes = await getNumberSetting("SESSION_MINUTES");

  if (!Number.isInteger(sessionMinutes) || sessionMinutes <= 0) {
    throw new Error("Invalid SESSION_MINUTES setting");
  }

  const sessionStart = input.provider.sessionStart;
  const sessionEnd = addMinutes(sessionStart, sessionMinutes);

  if (sessionStart < input.start || sessionEnd > input.end) {
    throw new Error("SESSION_OUTSIDE_BOOKING");
  }

  // Serialize competing reservations for this provider.
  // This must run inside a transaction.
  await tx.$queryRaw`
    SELECT "id"
    FROM "Provider"
    WHERE "id" = ${provider.id}
    FOR UPDATE
  `;

  // First reject any overlapping active reservation.
  const overlap = await tx.trainingSession.findFirst({
    where: {
      providerId: provider.id,
      status: {
        in: ["HELD", "SCHEDULED"],
      },
      startsAt: { lt: sessionEnd },
      endsAt: { gt: sessionStart },
    },
    select: {
      id: true,
    },
  });

  if (overlap) {
    throw new Error("PROVIDER_UNAVAILABLE");
  }

  // A non-overlapping time is not automatically an available time.
  // It must also match the provider's configured availability.
  const validStarts = await getValidSessionStarts(
    tx,
    provider.id,
    input.start,
    input.end,
  );

  const requestedStart = sessionStart.getTime();

  const isValidStart = validStarts.some(
    (candidate) => candidate.getTime() === requestedStart,
  );

  if (!isValidStart) {
    throw new Error("PROVIDER_UNAVAILABLE");
  }

  return {
    provider,
    providerPackage,
    sessionStart,
    sessionEnd,
  };
};

const selectConsultantForCheckout = async (tx, assignedConsultantId = null) => {
  const where = {
    type: "NUTRITION_CONSULTANT",
    isActive: true,
    ...(assignedConsultantId ? { id: assignedConsultantId } : {}),
  };
  const consultants = await tx.provider.findMany({
    where,
    select: { id: true, name: true, consultationPrice: true },
  });

  if (!consultants.length) throw new Error("NO_CONSULTANT_AVAILABLE");
  if (assignedConsultantId) return consultants[0];

  const counts = await tx.consultationAccess.groupBy({
    by: ["consultantId"],
    where: {
      consultantId: { in: consultants.map((consultant) => consultant.id) },
      status: "ACTIVE",
    },
    _count: { _all: true },
  });
  const activeCounts = new Map(
    counts.map((entry) => [entry.consultantId, entry._count._all]),
  );
  const minimum = Math.min(
    ...consultants.map((consultant) => activeCounts.get(consultant.id) ?? 0),
  );
  const leastBusy = consultants.filter(
    (consultant) => (activeCounts.get(consultant.id) ?? 0) === minimum,
  );

  return leastBusy[Math.floor(Math.random() * leastBusy.length)];
};

// --------------------------------------------------
// BUILD CHECKOUT QUOTE
// --------------------------------------------------

const buildQuote = async (tx, input) => {
  const gym = await tx.gym.findUnique({
    where: {
      id: input.gymId,
    },
  });

  if (!gym || !gym.isActive) {
    throw new Error("Gym is not active");
  }

  validateGymOpeningHours(gym, input.start, input.end);

  const gymPackage = await tx.package.findFirst({
    where: {
      id: input.packageId,
      gymId: input.gymId,
      isActive: true,
    },
  });

  if (!gymPackage) {
    throw new Error("Active package not found for this gym");
  }

  if (
    input.bookingType === "GROUP" &&
    input.headcount > gymPackage.maxGroupSize
  ) {
    throw new Error("Headcount exceeds the package group limit");
  }

  assertPackageRestrictions(gymPackage, input.start, input.end);

  const membership = await findCoveredMemberPackage(tx, input, gymPackage);

  const providerData = await validateProvider(tx, input);

  let consultationPrice = 0;
  let consultationProvider = null;

  if (input.consultation !== null) {
    consultationProvider = await selectConsultantForCheckout(
      tx,
      input.consultation.consultantId ?? null,
    );
    const platformPrice = await getNumberSetting("CONSULTATION_PRICE");
    consultationPrice = input.consultation.quotedPrice ??
      (consultationProvider.consultationPrice === null
        ? platformPrice
        : Number(consultationProvider.consultationPrice));

    if (!Number.isFinite(consultationPrice) || consultationPrice < 0) {
      throw new Error("Invalid consultation price");
    }
  }

  const items = [
    {
      type: "GYM_BOOKING",
      label: `Gym booking - ${gymPackage.name}`,
      amount: membership ? 0 : Number(gymPackage.price) * input.headcount,
      coveredByMembership: Boolean(membership),
    },
  ];

  if (providerData) {
    items.push({
      type: "PROVIDER_PACKAGE",
      label: `${providerData.provider.name} - ${providerData.providerPackage.name}`,
      amount: Number(providerData.providerPackage.price),
      providerId: providerData.provider.id,
      providerPackageId: providerData.providerPackage.id,
    });
  }

  if (input.consultation !== null) {
    items.push({
      type: "CONSULTATION",
      label: `Consultation - ${consultationProvider.name}`,
      amount: consultationPrice,
      providerId: consultationProvider.id,
    });
  }

  // Validate every item before calculating the final total.
  for (const item of items) {
    if (!Number.isFinite(item.amount) || item.amount < 0) {
      throw new Error("Invalid item price");
    }
  }

  const total = Number(
    items.reduce((sum, item) => sum + item.amount, 0).toFixed(2),
  );

  return {
    gym,
    gymPackage,
    membership,
    providerData,
    consultationProvider,
    items,
    total,
  };
};

// --------------------------------------------------
// QUOTE CHECKOUT
// --------------------------------------------------

const quoteCheckout = async (request) => {
  const input = validateInput(request);

  return prisma.$transaction(
    async (tx) => {
      const quote = await buildQuote(tx, input);

      return {
        items: quote.items.map((item) => ({
          type: item.type,
          label: item.label,
          amount: Number(money(item.amount)),
          ...(item.type === "GYM_BOOKING"
            ? { coveredByMembership: item.coveredByMembership ?? false }
            : {}),
        })),
        total: Number(money(quote.total)),
        ...(quote.consultationProvider
          ? {
              consultationAssignmentToken: signConsultationAssignment(
                input,
                quote.consultationProvider,
                quote.items.find((item) => item.type === "CONSULTATION").amount,
              ),
            }
          : {}),
      };
    },
    {
      maxWait: 10000,
      timeout: 30000,
    },
  );
};

// --------------------------------------------------
// CREATE CHECKOUT
// --------------------------------------------------

const createCheckout = async (request) => {
  const input = validateInput(request);

  if (input.consultation !== null) {
    const assignment = verifyConsultationAssignment(
      input,
      input.consultation.assignmentToken,
    );
    input.consultation.consultantId = assignment.consultantId;
    input.consultation.quotedPrice = assignment.consultationPrice;
  }

  const result = await prisma.$transaction(
    async (tx) => {
      // Lock the gym so concurrent checkout requests serialize
      // their capacity checks for this gym.
      const lockedGyms = await tx.$queryRaw`
        SELECT "id"
        FROM "Gym"
        WHERE "id" = ${input.gymId}
        FOR UPDATE
      `;

      if (!lockedGyms.length) {
        throw new Error("Gym not found");
      }

      // Release expired holds before checking capacity.
      await expireStale(tx, {
        gymId: input.gymId,
      });

      // Revalidate everything inside the transaction.
      const quote = await buildQuote(tx, input);

      const capacity = Number(quote.gym.capacity);

      const usedCapacity = await getUsedCapacity(
        tx,
        input.gymId,
        input.start,
        input.end,
      );

      if (
        !Number.isFinite(capacity) ||
        capacity <= 0 ||
        usedCapacity + input.headcount > capacity
      ) {
        throw new Error("CAPACITY_EXCEEDED");
      }

      const now = new Date();

      // A membership can cover the gym portion while other items
      // still require payment. Determine payment from the whole order.
      const requiresPayment = quote.total > 0;

      const booking = await tx.booking.create({
        data: {
          userId: input.userId,
          gymId: input.gymId,
          packageId: input.packageId,
          slotStart: input.start,
          slotEnd: input.end,
          bookingType: input.bookingType,
          headcount: input.headcount,

          // Do not confirm a booking before the entire order is paid.
          status: requiresPayment ? "pending" : "confirmed",

          memberPackageId: quote.membership?.id ?? null,
        },
      });

      const order = await tx.order.create({
        data: {
          userId: input.userId,
          gymId: input.gymId,
          bookingId: booking.id,
          totalAmount: money(quote.total),

          items: {
            create: quote.items.map((item) => ({
              type: item.type,
              label: item.label,
              amount: money(item.amount),
              providerId: item.providerId ?? null,
              providerPackageId: item.providerPackageId ?? null,
            })),
          },
        },
        include: {
          items: true,
        },
      });

      // Create the gym-package entitlement before payment confirmation.
      // Payment activation looks this record up by purchaseBookingId and
      // changes PENDING to ACTIVE after the whole order is paid. Existing
      // memberships used to cover this booking are not new purchases.
      if (!quote.membership) {
        await tx.memberPackage.create({
          data: {
            userId: input.userId,
            gymId: input.gymId,
            packageId: quote.gymPackage.id,
            purchaseBookingId: booking.id,
            startsAt: now,
            endsAt: addDays(now, quote.gymPackage.durationDays),
            maxVisits: quote.gymPackage.maxVisits,
            status: "PENDING",
          },
        });
      }

      // Create related records for order items.
      for (const item of order.items) {
        if (item.type === "PROVIDER_PACKAGE") {
          const providerData = quote.providerData;

          if (!providerData) {
            throw new Error("Provider package data is missing");
          }

          const { providerPackage, sessionStart, sessionEnd } = providerData;

          const purchase = await tx.providerPackagePurchase.create({
            data: {
              userId: input.userId,
              providerId: providerPackage.providerId,
              providerPackageId: providerPackage.id,
              orderItemId: item.id,
              packageName: providerPackage.name,
              sessionsTotal: providerPackage.sessionCount,
              pricePaid: money(providerPackage.price),

              // Payment-success logic should reset this expiry
              // using the actual successful payment time.
              expiresAt: addDays(now, providerPackage.validityDays),

              status: "PENDING",
            },
          });

          await tx.trainingSession.create({
            data: {
              purchaseId: purchase.id,
              bookingId: booking.id,
              providerId: providerPackage.providerId,
              userId: input.userId,
              startsAt: sessionStart,
              endsAt: sessionEnd,
              status: "HELD",
            },
          });
        }

        if (item.type === "CONSULTATION") {
          await tx.consultationAccess.create({
            data: {
              userId: input.userId,
              orderItemId: item.id,

              // The quote selected this consultant and locked their price;
              // payment activation will activate this assigned access.
              consultantId: item.providerId,
              status: "PENDING",
            },
          });
        }
      }

      // getOrderExpiryMinutes is asynchronous, so it must be awaited.
      const expiryMinutes = await getOrderExpiryMinutes();

      const expiresAt = addMinutes(order.createdAt ?? now, expiryMinutes);

      return {
        orderId: order.id,
        bookingId: booking.id,
        totalAmount: order.totalAmount.toString(),
        currency: "ETB",
        status: requiresPayment ? "PENDING" : "CONFIRMED",
        expiresAt,
        items: order.items,
        total: quote.total,
        requiresPayment,
      };
    },
    {
      maxWait: 10000,
      timeout: 30000,
    },
  );

  const { total, requiresPayment, ...response } = result;

  // Free checkout: confirm the booking and activate
  // any purchased entitlements using the shared payment logic.
  if (!requiresPayment) {
    const freeResult = await confirmFreeCheckout(
      response.bookingId,
      input.userId,
    );

    return {
      ...response,
      status: "CONFIRMED",
      bookingStatus: freeResult.booking.status,
      checkoutUrl: null,
      requiresPayment: false,
    };
  }

  // Paid checkout: initialize Chapa after the database
  // transaction has committed.
  let payment;
  try {
    payment = await initializePayment(response.bookingId, input.userId);
  } catch (error) {
    // The order and booking are already saved. Keep the full error in the server log.
    console.error(
      `Checkout: order ${response.orderId} (booking ${response.bookingId}) was created but payment initialization failed:`,
      error,
    );
    throw error;
  }

  return {
    ...response,
    status: "PENDING",
    checkoutUrl: payment.chapaCheckoutUrl,
    txRef: payment.chapaTxRef,
    requiresPayment: true,
  };

  return {
    orderId: order.id,
    bookingId: booking.id,

    // Return the actual times saved in the database.
    slotStart: booking.slotStart,
    slotEnd: booking.slotEnd,

    totalAmount: order.totalAmount.toString(),
    currency: "ETB",
    status: requiresPayment ? "PENDING" : "CONFIRMED",
    expiresAt,
    items: order.items,
    total: quote.total,
    requiresPayment,
  };
};

module.exports = {
  quoteCheckout,
  createCheckout,
};
