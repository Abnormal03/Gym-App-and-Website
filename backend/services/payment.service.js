const axios = require("axios");
const crypto = require("crypto");
const prisma = require("../config/prisma");
const {
  bookingTransitionsFromPayment,
} = require("../config/bookingTransitions");
const {
  getOrderExpiryMinutes,
  expireStale,
  getUsedCapacity,
} = require("./bookingHelpers.service");
const { getNumberSetting } = require("./platformSetting.service");
const { ensureChatThread } = require("./chatThread.service");
const { creditConsultationEarning } = require("./earning.service");
const { addDays } = require("../utils/time");

const CHAPA_BASE_URL = "https://api.chapa.co/v1";
const DEFAULT_CONSULTATION_CHAT_DAYS = 30;

/* -------------------------------------------------------------------------- */
/* General helpers                                                            */
/* -------------------------------------------------------------------------- */

const validateId = (value, fieldName = "ID") => {
  const id = Number(value);

  if (!Number.isSafeInteger(id) || id <= 0) {
    throw new Error(`Invalid ${fieldName}`);
  }

  return id;
};

const getPaymentErrorMessage = (error) => {
  const responseData = error.response?.data;
  const message = responseData?.message ?? responseData?.error ?? responseData;

  if (typeof message === "string" && message.trim()) {
    return message;
  }

  if (message && typeof message === "object") {
    try {
      return JSON.stringify(message);
    } catch {
      return error.message || "Chapa payment initialization failed";
    }
  }

  return error.message || "Chapa payment initialization failed";
};

const getChapaData = (verification) => verification?.data ?? {};

const getChapaStatus = (verification) =>
  String(
    verification?.status ?? getChapaData(verification).status ?? "",
  ).toLowerCase();

const getPaymentOutcome = (status) => {
  if (status === "success") return "success";

  if (["failed", "cancelled", "failed/cancelled"].includes(status)) {
    return "failed";
  }

  return "pending";
};

const amountsMatch = (first, second) => {
  const a = Number(first);
  const b = Number(second);

  return (
    Number.isFinite(a) &&
    Number.isFinite(b) &&
    Math.round(a * 100) === Math.round(b * 100)
  );
};

const getConsultationChatDays = async () => {
  let configured;

  try {
    configured = await getNumberSetting("CONSULTATION_CHAT_DAYS");
  } catch (error) {
    console.error("Could not read consultation chat setting:", error.message);

    configured =
      Number(process.env.CONSULTATION_CHAT_DAYS) ||
      DEFAULT_CONSULTATION_CHAT_DAYS;
  }

  if (!Number.isInteger(configured) || configured <= 0) {
    throw new Error("CONSULTATION_CHAT_DAYS must be a positive integer");
  }

  return configured;
};

const getSessionMinutes = async () => {
  const minutes = await getNumberSetting("SESSION_MINUTES");

  if (!Number.isInteger(minutes) || minutes <= 0) {
    throw new Error("SESSION_MINUTES must be a positive integer");
  }

  return minutes;
};

const validateVerifiedTransaction = (verification, payment, txRef) => {
  const data = getChapaData(verification);

  if (!data || typeof data !== "object") {
    throw new Error("Invalid Chapa verification response");
  }

  if (!data.tx_ref || data.tx_ref !== txRef) {
    throw new Error("Verified Chapa transaction reference does not match");
  }

  if (data.amount === undefined || data.amount === null) {
    throw new Error("Chapa verification response is missing the amount");
  }

  if (!amountsMatch(data.amount, payment.amount)) {
    throw new Error("Verified Chapa amount does not match payment amount");
  }

  if (String(data.currency ?? "").toUpperCase() !== "ETB") {
    throw new Error("Verified Chapa currency does not match ETB");
  }
};

/* -------------------------------------------------------------------------- */
/* Record payment initialization failure                                      */
/* -------------------------------------------------------------------------- */

const recordInitializationFailure = async ({
  bookingId,
  userId,
  amount,
  txRef,
}) => {
  return prisma.$transaction(async (tx) => {
    const booking = await tx.booking.findUnique({
      where: { id: bookingId },
    });

    if (!booking) {
      throw new Error("Booking not found");
    }

    const existingPayment = await tx.payment.findUnique({
      where: { bookingId },
    });

    if (existingPayment?.status === "success") {
      return {
        payment: existingPayment,
        booking,
      };
    }

    const payment = await tx.payment.upsert({
      where: { bookingId },
      update: {
        amount,
        chapaTxRef: txRef,
        chapaCheckoutUrl: null,
        status: "failed",
      },
      create: {
        userId,
        bookingId,
        amount,
        chapaTxRef: txRef,
        chapaCheckoutUrl: null,
        currency: "ETB",
        status: "failed",
      },
    });

    const nextStatus = bookingTransitionsFromPayment[booking.status]?.failed;

    let updatedBooking = booking;

    if (
      nextStatus &&
      nextStatus !== booking.status &&
      !["cancelled", "expired", "confirmed", "checked_in"].includes(
        booking.status,
      )
    ) {
      updatedBooking = await tx.booking.update({
        where: { id: bookingId },
        data: { status: nextStatus },
      });
    }

    return {
      payment,
      booking: updatedBooking,
    };
  });
};
/* -------------------------------------------------------------------------- */
/* Chapa payment initialization                                               */
/* -------------------------------------------------------------------------- */
const initializePayment = async (bookingId, userId) => {
  if (!process.env.CHAPA_SECRET_KEY) {
    throw new Error("CHAPA_SECRET_KEY is missing");
  }

  if (!process.env.CHAPA_CALLBACK_URL || !process.env.CHAPA_RETURN_URL) {
    throw new Error("Chapa callback and return URLs must be configured");
  }

  bookingId = validateId(bookingId, "booking ID");
  userId = validateId(userId, "user ID");

  const booking = await prisma.booking.findUnique({
    where: { id: bookingId },
    include: {
      package: true,
      user: true,
      payment: true,
      order: {
        select: {
          id: true,
          totalAmount: true,
        },
      },
    },
  });

  if (!booking) {
    throw new Error("Booking not found");
  }

  if (booking.userId !== userId) {
    throw new Error("Access denied");
  }

  if (!["pending", "payment_failed"].includes(booking.status)) {
    throw new Error(`Cannot pay for a booking with status ${booking.status}`);
  }

  if (!booking.order && !booking.package) {
    throw new Error("Booking has neither an order nor a gym package");
  }

  if (!booking.user) {
    throw new Error("Booking user not found");
  }

  if (booking.payment?.status === "success") {
    throw new Error("This booking has already been paid");
  }

  const amount = booking.order
    ? Number(booking.order.totalAmount)
    : Number(booking.package.price);

  if (!Number.isFinite(amount) || amount <= 0) {
    throw new Error("Invalid payment amount");
  }

  const txRef = `booking-${bookingId}-${Date.now()}-${crypto.randomUUID().slice(0, 8)}`;

  const returnUrl = new URL(process.env.CHAPA_RETURN_URL);
  returnUrl.searchParams.set("tx_ref", txRef);

  let chapaResponse;

  try {
    chapaResponse = await axios.post(
      `${CHAPA_BASE_URL}/transaction/initialize`,
      {
        amount: amount.toFixed(2),
        currency: "ETB",
        email: booking.user.email,
        first_name: booking.user.name?.split(" ")[0] || "Member",
        last_name: booking.user.name?.split(" ").slice(1).join(" ") || "User",
        tx_ref: txRef,
        callback_url: process.env.CHAPA_CALLBACK_URL,
        return_url: returnUrl.toString(),

        customization: {
          title: booking.order ? "Gym Order" : "Gym Booking",
          description: booking.order
            ? `Payment for order ${booking.order.id}`
            : `Payment for booking ${bookingId}`,
        },
      },
      {
        headers: {
          Authorization: `Bearer ${process.env.CHAPA_SECRET_KEY}`,
          "Content-Type": "application/json",
        },
        timeout: 30000,
      },
    );
  } catch (error) {
    try {
      await recordInitializationFailure({
        bookingId,
        userId,
        amount,
        txRef,
      });
    } catch (databaseError) {
      console.error(
        "Failed to record payment initialization failure:",
        databaseError.message,
      );
    }

    throw new Error(getPaymentErrorMessage(error));
  }

  const checkoutUrl = chapaResponse.data?.data?.checkout_url;

  if (!checkoutUrl) {
    await recordInitializationFailure({
      bookingId,
      userId,
      amount,
      txRef,
    });

    throw new Error("Chapa did not return checkout URL");
  }

  return prisma.$transaction(async (tx) => {
    const currentBooking = await tx.booking.findUnique({
      where: { id: bookingId },
    });

    if (!currentBooking) {
      throw new Error("Booking not found");
    }

    if (!["pending", "payment_failed"].includes(currentBooking.status)) {
      throw new Error(
        `Cannot pay for a booking with status ${currentBooking.status}`,
      );
    }

    const existingPayment = await tx.payment.findUnique({
      where: { bookingId },
    });

    if (existingPayment?.status === "success") {
      throw new Error("This booking has already been paid");
    }

    return tx.payment.upsert({
      where: { bookingId },
      update: {
        amount,
        chapaTxRef: txRef,
        chapaCheckoutUrl: checkoutUrl,
        status: "pending",
      },
      create: {
        userId,
        bookingId,
        amount,
        currency: "ETB",
        chapaTxRef: txRef,
        chapaCheckoutUrl: checkoutUrl,
        status: "pending",
      },
    });
  });
};

/* -------------------------------------------------------------------------- */
/* Verify directly with Chapa                                                 */
/* -------------------------------------------------------------------------- */

const verifyChapaTransaction = async (txRef) => {
  if (!process.env.CHAPA_SECRET_KEY) {
    throw new Error("CHAPA_SECRET_KEY is missing");
  }

  if (typeof txRef !== "string" || !txRef.trim()) {
    throw new Error("Transaction reference is required");
  }

  const response = await axios.get(
    `${CHAPA_BASE_URL}/transaction/verify/${encodeURIComponent(txRef)}`,
    {
      headers: {
        Authorization: `Bearer ${process.env.CHAPA_SECRET_KEY}`,
        "Content-Type": "application/json",
      },
      timeout: 30000,
    },
  );

  return response.data;
};

/* -------------------------------------------------------------------------- */
/* Webhook signature                                                          */
/* -------------------------------------------------------------------------- */

const isValidWebhookSignature = (rawBody, signatureHeader) => {
  if (!rawBody || !signatureHeader || !process.env.CHAPA_WEBHOOK_SECRET) {
    return false;
  }

  const body = Buffer.isBuffer(rawBody)
    ? rawBody
    : Buffer.from(String(rawBody), "utf8");

  const expectedHash = crypto
    .createHmac("sha256", process.env.CHAPA_WEBHOOK_SECRET)
    .update(body)
    .digest("hex");

  const expectedBuffer = Buffer.from(expectedHash, "utf8");
  const receivedBuffer = Buffer.from(String(signatureHeader), "utf8");

  if (expectedBuffer.length !== receivedBuffer.length) {
    return false;
  }

  return crypto.timingSafeEqual(expectedBuffer, receivedBuffer);
};

/* -------------------------------------------------------------------------- */
/* Entitlement activation                                                     */
/* -------------------------------------------------------------------------- */

const activateMemberPackage = async (tx, order, paidAt) => {
  if (!order) return;

  const memberPackage = await tx.memberPackage.findUnique({
    where: {
      purchaseBookingId: order.bookingId,
    },
    include: {
      package: true,
    },
  });

  if (!memberPackage || memberPackage.status === "ACTIVE") {
    return;
  }

  if (!["PENDING", "EXPIRED"].includes(memberPackage.status)) {
    throw new Error(
      `Cannot activate gym package with status ${memberPackage.status}`,
    );
  }

  await tx.memberPackage.update({
    where: {
      id: memberPackage.id,
    },
    data: {
      status: "ACTIVE",
      startsAt: paidAt,
      endsAt: addDays(paidAt, memberPackage.package.durationDays),
    },
  });
};

const activateProviderPackagePurchases = async (tx, order, paidAt) => {
  if (!order) return;

  const items = await tx.orderItem.findMany({
    where: {
      orderId: order.id,
      type: "PROVIDER_PACKAGE",
    },
    include: {
      providerPackage: true,
      purchase: true,
    },
  });
  if (items.length === 0) return;
  const sessionMinutes = await getSessionMinutes();

  for (const item of items) {
    const providerPackage = item.providerPackage;

    if (!providerPackage) {
      throw new Error(`Provider package missing for order item ${item.id}`);
    }

    const providerId = item.providerId ?? providerPackage.providerId;

    let purchase = item.purchase;

    if (!purchase) {
      purchase = await tx.providerPackagePurchase.create({
        data: {
          userId: order.userId,
          providerId,
          providerPackageId: providerPackage.id,
          orderItemId: item.id,
          packageName: providerPackage.name,
          sessionsTotal: providerPackage.sessionCount,
          pricePaid: item.amount,
          expiresAt: addDays(paidAt, providerPackage.validityDays),
          status: "ACTIVE",
        },
      });
    } else if (purchase.status !== "ACTIVE") {
      if (!["PENDING", "EXPIRED"].includes(purchase.status)) {
        throw new Error(
          `Cannot activate provider package purchase in status ${purchase.status}`,
        );
      }

      purchase = await tx.providerPackagePurchase.update({
        where: {
          id: purchase.id,
        },
        data: {
          status: "ACTIVE",
          expiresAt: addDays(paidAt, providerPackage.validityDays),
        },
      });
    }

    const sessions = await tx.trainingSession.findMany({
      where: {
        purchaseId: purchase.id,
        bookingId: order.bookingId,
      },
    });

    for (const session of sessions) {
      if (session.status === "SCHEDULED") continue;

      if (!["HELD", "CANCELLED"].includes(session.status)) {
        throw new Error(
          `Cannot schedule training session in status ${session.status}`,
        );
      }

      const startsAt = session.startsAt;

      const endsAt =
        session.endsAt ||
        new Date(startsAt.getTime() + sessionMinutes * 60 * 1000);

      await tx.trainingSession.update({
        where: {
          id: session.id,
        },
        data: {
          status: "SCHEDULED",
          startsAt,
          endsAt,
          cancelledAt: null,
        },
      });
    }

    await ensureChatThread(tx, order.userId, providerId);
  }
};

/* -------------------------------------------------------------------------- */
/* Consultation assignment                                                    */
/* -------------------------------------------------------------------------- */

const selectConsultant = async (tx, requestedConsultantId) => {
  const consultants = await tx.provider.findMany({
    where: {
      type: "NUTRITION_CONSULTANT",
      isActive: true,
      ...(requestedConsultantId ? { id: requestedConsultantId } : {}),
    },
    select: {
      id: true,
    },
  });

  if (!consultants.length) {
    throw new Error("No active nutrition consultants available");
  }

  if (requestedConsultantId) {
    return consultants[0];
  }

  const counts = await tx.consultationAccess.groupBy({
    by: ["consultantId"],
    where: {
      consultantId: {
        in: consultants.map((item) => item.id),
      },
      status: "ACTIVE",
    },
    _count: {
      _all: true,
    },
  });

  const accessCounts = new Map(
    counts.map((item) => [item.consultantId, item._count._all]),
  );

  const minimum = Math.min(
    ...consultants.map((item) => accessCounts.get(item.id) ?? 0),
  );

  const leastBusy = consultants.filter(
    (item) => (accessCounts.get(item.id) ?? 0) === minimum,
  );

  return leastBusy[Math.floor(Math.random() * leastBusy.length)];
};

const activateConsultations = async (tx, order, paidAt) => {
  if (!order) return;

  const items = await tx.orderItem.findMany({
    where: {
      orderId: order.id,
      type: "CONSULTATION",
    },
    include: {
      consultation: true,
    },
  });

  if (!items.length) return;

  const chatDays = await getConsultationChatDays();

  for (const item of items) {
    let access = item.consultation;

    if (access?.status === "ACTIVE") {
      if (!access.consultantId) {
        throw new Error(
          `Active consultation ${access.id} has no assigned consultant`,
        );
      }

      await ensureChatThread(tx, access.userId, access.consultantId);

      await creditConsultationEarning(tx, item.id, access.consultantId);

      continue;
    }

    if (access && !["PENDING", "EXPIRED"].includes(access.status)) {
      throw new Error(
        `Cannot activate consultation in status ${access.status}`,
      );
    }

    const consultant = await selectConsultant(tx, item.providerId ?? null);

    const data = {
      consultantId: consultant.id,
      status: "ACTIVE",
      assignedAt: paidAt,
      startsAt: paidAt,
      expiresAt: addDays(paidAt, chatDays),
    };

    if (!access) {
      access = await tx.consultationAccess.create({
        data: {
          userId: order.userId,
          orderItemId: item.id,
          ...data,
        },
      });
    } else {
      access = await tx.consultationAccess.update({
        where: {
          id: access.id,
        },
        data,
      });
    }

    await tx.orderItem.update({
      where: {
        id: item.id,
      },
      data: {
        providerId: consultant.id,
      },
    });

    await ensureChatThread(tx, access.userId, consultant.id);

    await creditConsultationEarning(tx, item.id, consultant.id);
  }
};

/* -------------------------------------------------------------------------- */
/* Locking and late-payment availability checks                               */
/* -------------------------------------------------------------------------- */

const lockGym = async (tx, gymId) => {
  await tx.$queryRawUnsafe(
    'SELECT "id" FROM "Gym" WHERE "id" = $1 FOR UPDATE',
    gymId,
  );
};

const lockProvider = async (tx, providerId) => {
  await tx.$queryRawUnsafe(
    'SELECT "id" FROM "Provider" WHERE "id" = $1 FOR UPDATE',
    providerId,
  );
};

const canHonorLatePayment = async (tx, booking) => {
  await lockGym(tx, booking.gymId);

  const gym = await tx.gym.findUnique({
    where: {
      id: booking.gymId,
    },
    select: {
      id: true,
      capacity: true,
      isActive: true,
    },
  });

  if (!gym || !gym.isActive) return false;

  const usedCapacity = await getUsedCapacity(
    tx,
    booking.gymId,
    booking.slotStart,
    booking.slotEnd,
  );

  if (usedCapacity + booking.headcount > gym.capacity) {
    return false;
  }

  const providerItems = booking.order
    ? await tx.orderItem.findMany({
        where: {
          orderId: booking.order.id,
          type: "PROVIDER_PACKAGE",
        },
        include: {
          providerPackage: true,
        },
      })
    : [];

  for (const item of providerItems) {
    const providerPackage = item.providerPackage;

    if (!providerPackage || !providerPackage.isActive) {
      return false;
    }

    const providerId = item.providerId ?? providerPackage.providerId;

    if (providerPackage.providerId !== providerId) {
      return false;
    }

    await lockProvider(tx, providerId);

    const provider = await tx.provider.findUnique({
      where: {
        id: providerId,
      },
      select: {
        id: true,
        gymId: true,
        isActive: true,
        type: true,
      },
    });

    if (
      !provider ||
      !provider.isActive ||
      provider.gymId !== booking.gymId ||
      !["TRAINER", "PHYSIOTHERAPIST"].includes(provider.type)
    ) {
      return false;
    }

    const sessions = await tx.trainingSession.findMany({
      where: {
        bookingId: booking.id,
        providerId,
      },
      select: {
        startsAt: true,
        endsAt: true,
      },
    });

    if (!sessions.length) return false;

    for (const session of sessions) {
      const conflictingSession = await tx.trainingSession.findFirst({
        where: {
          providerId,
          bookingId: {
            not: booking.id,
          },
          status: {
            in: ["HELD", "SCHEDULED"],
          },
          startsAt: {
            lt: session.endsAt,
          },
          endsAt: {
            gt: session.startsAt,
          },
        },
        select: {
          id: true,
        },
      });

      if (conflictingSession) return false;
    }
  }

  return true;
};

/* -------------------------------------------------------------------------- */
/* Shared successful confirmation                                             */
/* -------------------------------------------------------------------------- */

const confirmOrderInTransaction = async (tx, booking, order, paidAt) => {
  let updatedBooking = booking;

  if (booking.status !== "confirmed" && booking.status !== "checked_in") {
    const nextStatus = bookingTransitionsFromPayment[booking.status]?.success;

    if (nextStatus) {
      const data = {
        status: nextStatus,
      };

      if (!booking.qrCode) {
        data.qrCode = crypto.randomUUID();
      }

      updatedBooking = await tx.booking.update({
        where: {
          id: booking.id,
        },
        data,
      });
    } else if (["expired", "cancelled"].includes(booking.status)) {
      updatedBooking = await tx.booking.update({
        where: {
          id: booking.id,
        },
        data: {
          status: "confirmed",
          ...(booking.qrCode ? {} : { qrCode: crypto.randomUUID() }),
        },
      });
    } else {
      throw new Error(
        `No valid confirmation transition from booking status "${booking.status}"`,
      );
    }
  }

  if (order) {
    await activateMemberPackage(tx, order, paidAt);
    await activateProviderPackagePurchases(tx, order, paidAt);
    await activateConsultations(tx, order, paidAt);
  }

  return updatedBooking;
};

const confirmFreeCheckout = async (bookingId, userId) => {
  bookingId = validateId(bookingId, "booking ID");
  userId = validateId(userId, "user ID");

  return prisma.$transaction(
    async (tx) => {
      const booking = await tx.booking.findUnique({
        where: {
          id: bookingId,
        },
        include: {
          order: true,
        },
      });

      if (!booking) {
        throw new Error("Booking not found");
      }

      if (booking.userId !== userId) {
        throw new Error("Access denied");
      }

      if (!booking.order) {
        throw new Error("Order not found for free checkout");
      }

      if (Number(booking.order.totalAmount) !== 0) {
        throw new Error("Cannot confirm a non-zero order as free");
      }

      if (
        ["cancelled", "expired"].includes(booking.status) &&
        !(await canHonorLatePayment(tx, booking))
      ) {
        throw new Error("The booking is no longer available");
      }

      const confirmedBooking = await confirmOrderInTransaction(
        tx,
        booking,
        booking.order,
        new Date(),
      );

      return {
        booking: confirmedBooking,
        orderId: booking.order.id,
        status: "PAID",
        totalAmount: 0,
        checkoutUrl: null,
      };
    },
    {
      maxWait: 10000,
      timeout: 30000,
    },
  );
};

/* -------------------------------------------------------------------------- */
/* Process verified payment results                                           */
/* -------------------------------------------------------------------------- */

const processPaymentResult = async (txRef) => {
  if (typeof txRef !== "string" || !txRef.trim()) {
    throw new Error("Transaction reference is required");
  }

  const payment = await prisma.payment.findUnique({
    where: {
      chapaTxRef: txRef,
    },
  });

  if (!payment) {
    throw new Error(`Payment not found for tx_ref: ${txRef}`);
  }

  const verification = await verifyChapaTransaction(txRef);

  console.log(
    "Chapa verification response:",
    JSON.stringify(verification, null, 2),
  );
  const chapaStatus = getChapaStatus(verification);
  const outcome = getPaymentOutcome(chapaStatus);

  if (outcome === "success") {
    validateVerifiedTransaction(verification, payment, txRef);
  }

  if (outcome === "pending") {
    const currentPayment = await prisma.payment.findUnique({
      where: {
        id: payment.id,
      },
      include: {
        booking: true,
      },
    });

    return {
      payment: currentPayment,
      booking: currentPayment?.booking ?? null,
      chapaStatus,
      outcome,
    };
  }

  return prisma.$transaction(
    async (tx) => {
      await tx.$queryRawUnsafe(
        'SELECT "id" FROM "Payment" WHERE "id" = $1 FOR UPDATE',
        payment.id,
      );

      const currentPayment = await tx.payment.findUnique({
        where: {
          id: payment.id,
        },
      });

      if (!currentPayment) {
        throw new Error("Payment not found");
      }

      const initialBooking = await tx.booking.findUnique({
        where: {
          id: currentPayment.bookingId,
        },
      });

      if (!initialBooking) {
        throw new Error("Booking not found");
      }

      if (currentPayment.status === "success") {
        return {
          payment: currentPayment,
          booking: initialBooking,
          chapaStatus,
          outcome: "success",
        };
      }

      if (outcome === "failed") {
        await tx.payment.update({
          where: {
            id: currentPayment.id,
          },
          data: {
            status: "failed",
          },
        });

        const nextStatus =
          bookingTransitionsFromPayment[initialBooking.status]?.failed;

        let updatedBooking = initialBooking;

        if (
          nextStatus &&
          !["cancelled", "expired", "confirmed", "checked_in"].includes(
            initialBooking.status,
          )
        ) {
          updatedBooking = await tx.booking.update({
            where: {
              id: initialBooking.id,
            },
            data: {
              status: nextStatus,
            },
          });
        }

        const updatedPayment = await tx.payment.findUnique({
          where: {
            id: currentPayment.id,
          },
        });

        return {
          payment: updatedPayment,
          booking: updatedBooking,
          chapaStatus,
          outcome: "failed",
        };
      }

      await expireStale(tx, {
        gymId: initialBooking.gymId,
      });

      const booking = await tx.booking.findUnique({
        where: {
          id: currentPayment.bookingId,
        },
        include: {
          order: {
            include: {
              items: true,
            },
          },
        },
      });

      if (!booking) {
        throw new Error("Booking not found");
      }

      if (
        ["expired", "cancelled"].includes(booking.status) &&
        !(await canHonorLatePayment(tx, booking))
      ) {
        await tx.payment.update({
          where: {
            id: currentPayment.id,
          },
          data: {
            status: "success",
          },
        });

        if (booking.order) {
          await tx.order.update({
            where: {
              id: booking.order.id,
            },
            data: {
              needsManualRefund: true,
              refundNote:
                `Chapa reported successful payment for a ${booking.status} booking, ` +
                "but the booking could not be honored. Review and refund manually.",
            },
          });
        }

        const updatedPayment = await tx.payment.findUnique({
          where: {
            id: currentPayment.id,
          },
        });

        return {
          payment: updatedPayment,
          booking,
          chapaStatus,
          outcome: "success",
          needsManualRefund: true,
        };
      }

      await tx.payment.update({
        where: {
          id: currentPayment.id,
        },
        data: {
          status: "success",
        },
      });

      const updatedBooking = await confirmOrderInTransaction(
        tx,
        booking,
        booking.order,
        new Date(),
      );

      const updatedPayment = await tx.payment.findUnique({
        where: {
          id: currentPayment.id,
        },
      });

      return {
        payment: updatedPayment,
        booking: updatedBooking,
        chapaStatus,
        outcome: "success",
      };
    },
    {
      maxWait: 10000,
      timeout: 30000,
    },
  );
};

/* -------------------------------------------------------------------------- */
/* Chapa webhook                                                              */
/* Supports controller signature: (parsedPayload, rawBody, signature).        */
/* -------------------------------------------------------------------------- */

const handleChapaWebhook = async (
  payloadOrRawBody,
  rawBodyOrSignature,
  maybeSignature,
) => {
  const rawBody =
    maybeSignature === undefined ? payloadOrRawBody : rawBodyOrSignature;

  const signatureHeader =
    maybeSignature === undefined ? rawBodyOrSignature : maybeSignature;

  if (!isValidWebhookSignature(rawBody, signatureHeader)) {
    throw new Error("Invalid webhook signature");
  }

  let event = payloadOrRawBody;

  if (!event || typeof event !== "object" || Buffer.isBuffer(event)) {
    try {
      event = JSON.parse(
        Buffer.isBuffer(rawBody) ? rawBody.toString("utf8") : String(rawBody),
      );
    } catch {
      throw new Error("Invalid webhook JSON");
    }
  }

  const txRef = event?.tx_ref || event?.trx_ref || event?.data?.tx_ref;

  if (typeof txRef !== "string" || !txRef.trim()) {
    throw new Error("Webhook payload missing tx_ref");
  }

  return processPaymentResult(txRef);
};

/* -------------------------------------------------------------------------- */
/* Check payment status for the authenticated owner                           */
/* -------------------------------------------------------------------------- */

const checkPaymentStatus = async (txRef, userId) => {
  if (typeof txRef !== "string" || !txRef.trim()) {
    throw new Error("Transaction reference is required");
  }

  userId = validateId(userId, "user ID");

  let payment = await prisma.payment.findUnique({
    where: {
      chapaTxRef: txRef,
    },
    include: {
      booking: true,
    },
  });

  if (!payment) {
    throw new Error("Payment not found");
  }

  if (payment.userId !== userId) {
    throw new Error("Access denied");
  }

  if (payment.status === "pending" && payment.booking?.status === "pending") {
    const expiryMinutes = await getOrderExpiryMinutes();

    if (!Number.isFinite(expiryMinutes) || expiryMinutes <= 0) {
      throw new Error("Invalid order expiry setting");
    }

    const expiryCutoff = new Date(Date.now() - expiryMinutes * 60 * 1000);

    if (payment.booking.createdAt < expiryCutoff) {
      await prisma.$transaction(
        async (tx) => {
          await expireStale(tx, {
            gymId: payment.booking.gymId,
          });

          const freshBooking = await tx.booking.findUnique({
            where: {
              id: payment.bookingId,
            },
          });

          if (freshBooking?.status === "expired") {
            await tx.payment.updateMany({
              where: {
                id: payment.id,
                status: "pending",
              },
              data: {
                status: "failed",
              },
            });
          }
        },
        {
          maxWait: 10000,
          timeout: 30000,
        },
      );
    }
  }

  payment = await prisma.payment.findUnique({
    where: {
      chapaTxRef: txRef,
    },
    include: {
      booking: true,
    },
  });

  if (!payment) {
    throw new Error("Payment not found");
  }

  const result = await processPaymentResult(txRef);

  const freshBooking = await prisma.booking.findUnique({
    where: {
      id: payment.bookingId,
    },
  });

  return {
    localStatus: result.payment?.status ?? payment.status,
    chapaStatus: result.chapaStatus,
    bookingStatus: freshBooking?.status ?? null,
    qrCode: freshBooking?.qrCode ?? null,
    expired: freshBooking?.status === "expired",
    ...(result.needsManualRefund ? { needsManualRefund: true } : {}),
  };
};

/* -------------------------------------------------------------------------- */
/* V2 compatibility methods                                                   */
/* -------------------------------------------------------------------------- */

/*
 * In V2, a TrainingSession is paid through its Order/provider-package
 * purchase. The supplied schema has no independent trainer-session payment
 * record, so this method fails clearly rather than using nonexistent fields.
 */

const initializeTrainerSessionPayment = async (trainerSessionId, userId) => {
  validateId(trainerSessionId, "trainer session ID");
  validateId(userId, "user ID");

  const session = await prisma.trainingSession.findUnique({
    where: {
      id: trainerSessionId,
    },
    include: {
      booking: {
        include: {
          order: true,
        },
      },
      purchase: true,
    },
  });

  if (!session) {
    throw new Error("Trainer session not found");
  }

  if (session.userId !== userId) {
    throw new Error("Access denied");
  }

  throw new Error(
    "Individual trainer-session payments are not supported in V2. " +
    "Pay for the associated provider-package order instead.",
  );
};

const processTrainerSessionPayment = async (txRef) => {
  if (typeof txRef !== "string" || !txRef.trim()) {
    throw new Error("Transaction reference is required");
  }

  return processPaymentResult(txRef);
};

/* -------------------------------------------------------------------------- */
/* Chapa refund support                                                       */
/* -------------------------------------------------------------------------- */

const refundChapaTransaction = async (txRef, amount) => {
  if (!process.env.CHAPA_SECRET_KEY) {
    throw new Error("CHAPA_SECRET_KEY is missing");
  }

  if (typeof txRef !== "string" || !txRef.trim()) {
    throw new Error("Transaction reference is required");
  }

  const body = {};

  if (amount !== undefined && amount !== null) {
    const parsedAmount = Number(amount);

    if (!Number.isFinite(parsedAmount) || parsedAmount <= 0) {
      throw new Error("Refund amount must be a positive number");
    }

    body.amount = parsedAmount.toFixed(2);
  }

  try {
    const response = await axios.post(
      `${CHAPA_BASE_URL}/transaction/refund/${encodeURIComponent(txRef)}`,
      body,
      {
        headers: {
          Authorization: `Bearer ${process.env.CHAPA_SECRET_KEY}`,
          "Content-Type": "application/json",
        },
        timeout: 30000,
      },
    );

    return response.data;
  } catch (error) {
    throw new Error(getPaymentErrorMessage(error));
  }
};

/* -------------------------------------------------------------------------- */
/* Exports                                                                    */
/* -------------------------------------------------------------------------- */

module.exports = {
  initializePayment,
  verifyChapaTransaction,
  checkPaymentStatus,
  processPaymentResult,
  handleChapaWebhook,
  activateMemberPackage,
  confirmFreeCheckout,
};
