const axios = require("axios");
const crypto = require("crypto");
const prisma = require("../config/prisma");

const {
  bookingTransitionsFromPayment,
} = require("../config/bookingTransitions");

const {
  trainerSessionTransitionsFromPayment,
} = require("../config/trainerSessionTransitions");

const CHAPA_BASE_URL = "https://api.chapa.co/v1";
const CHAPA_SECRET_KEY = process.env.CHAPA_SECRET_KEY;
const CHAPA_WEBHOOK_SECRET = process.env.CHAPA_WEBHOOK_SECRET;
const CHAPA_CALLBACK_URL = process.env.CHAPA_CALLBACK_URL;
const CHAPA_RETURN_URL = process.env.CHAPA_RETURN_URL;
const EXPIRY_MINUTES = 30;

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
      return error.message;
    }
  }

  return error.message || "Chapa payment initialization failed";
};

const getBookingExpiresAt = (booking) => {
  return new Date(booking.createdAt.getTime() + EXPIRY_MINUTES * 60 * 1000);
};

const isBookingExpired = (booking) => {
  return new Date() > getBookingExpiresAt(booking);
};

const isTrainerSessionExpired = (session) => {
  if (!session.expiresAt) {
    return false;
  }

  return new Date() > new Date(session.expiresAt);
};

const initializePayment = async (bookingId, userId) => {
  if (!CHAPA_SECRET_KEY) {
    throw new Error("CHAPA_SECRET_KEY is missing");
  }

  const booking = await prisma.booking.findUnique({
    where: {
      id: bookingId,
    },
    include: {
      package: true,
      user: true,
      payment: true,
    },
  });

  if (!booking) {
    throw new Error("Booking not found");
  }

  if (booking.userId !== userId) {
    throw new Error("Access denied");
  }

  if (booking.status !== "pending" && booking.status !== "payment_failed") {
    throw new Error(`Cannot pay for a booking with status ${booking.status}`);
  }

  if (isBookingExpired(booking)) {
    throw new Error("Booking payment window has expired");
  }

  if (!booking.package) {
    throw new Error("Booking has no package");
  }

  if (!booking.user) {
    throw new Error("Booking user not found");
  }

  const amount = Number(booking.package.price);

  if (!Number.isFinite(amount) || amount <= 0) {
    throw new Error("Invalid payment amount");
  }

  if (!CHAPA_CALLBACK_URL || !CHAPA_RETURN_URL) {
    throw new Error("Chapa callback and return URLs must be configured");
  }

  const txRef = `booking-${bookingId}-${Date.now()}`;

  const returnUrl = new URL(CHAPA_RETURN_URL);
  returnUrl.searchParams.set("tx_ref", txRef);

  let chapaResponse;

  try {
    chapaResponse = await axios.post(
      `${CHAPA_BASE_URL}/transaction/initialize`,
      {
        amount: amount.toString(),
        currency: "ETB",
        email: booking.user.email,
        first_name: booking.user.name?.split(" ")[0] || "Member",
        last_name: booking.user.name?.split(" ").slice(1).join(" ") || "User",
        tx_ref: txRef,
        callback_url: CHAPA_CALLBACK_URL,
        return_url: returnUrl.toString(),
        customization: {
          title: "Gym Booking",
          description: `Payment for booking ${bookingId}`,
        },
      },
      {
        headers: {
          Authorization: `Bearer ${CHAPA_SECRET_KEY}`,
          "Content-Type": "application/json",
        },
        timeout: 30000,
      },
    );
  } catch (error) {
    try {
      await prisma.$transaction(async (tx) => {
        await tx.payment.upsert({
          where: {
            bookingId,
          },
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
            currency: "ETB",
            chapaTxRef: txRef,
            chapaCheckoutUrl: null,
            status: "failed",
          },
        });

        await tx.booking.update({
          where: {
            id: bookingId,
          },
          data: {
            status: "payment_failed",
          },
        });
      });
    } catch (databaseError) {
      console.error("FAILED TO SAVE FAILED PAYMENT:", databaseError);
    }

    throw new Error(getPaymentErrorMessage(error));
  }

  const checkoutUrl = chapaResponse.data?.data?.checkout_url;

  if (!checkoutUrl) {
    await prisma.$transaction(async (tx) => {
      await tx.payment.upsert({
        where: {
          bookingId,
        },
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
          currency: "ETB",
          chapaTxRef: txRef,
          chapaCheckoutUrl: null,
          status: "failed",
        },
      });

      await tx.booking.update({
        where: {
          id: bookingId,
        },
        data: {
          status: "payment_failed",
        },
      });
    });

    throw new Error("Chapa did not return checkout URL");
  }

  return prisma.payment.upsert({
    where: {
      bookingId,
    },
    update: {
      amount,
      chapaTxRef: txRef,
      chapaCheckoutUrl: checkoutUrl,
      status: "pending",
      chapaRefundRef: null,
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
};

const initializeTrainerSessionPayment = async (trainerSessionId, userId) => {
  if (!CHAPA_SECRET_KEY) {
    throw new Error("CHAPA_SECRET_KEY is missing");
  }

  const session = await prisma.trainerSession.findUnique({
    where: {
      id: trainerSessionId,
    },
    include: {
      member: true,
      trainer: true,
      payment: true,
    },
  });

  if (!session) {
    throw new Error("Trainer session not found");
  }

  if (session.memberId !== userId) {
    throw new Error("Access denied");
  }

  if (
    session.status !== "PENDING_PAYMENT" &&
    session.status !== "PAYMENT_FAILED"
  ) {
    throw new Error(
      `Cannot pay for a trainer session with status ${session.status}`,
    );
  }

  if (isTrainerSessionExpired(session)) {
    throw new Error("Trainer session payment window has expired");
  }

  if (!session.member) {
    throw new Error("Trainer session member not found");
  }

  if (!session.trainer) {
    throw new Error("Trainer not found");
  }

  const amount = Number(session.price);

  if (!Number.isFinite(amount) || amount <= 0) {
    throw new Error("Invalid trainer session payment amount");
  }

  if (!CHAPA_CALLBACK_URL || !CHAPA_RETURN_URL) {
    throw new Error("Chapa callback and return URLs must be configured");
  }

  const txRef = `trainer-session-${trainerSessionId}-${Date.now()}`;

  const returnUrl = new URL(CHAPA_RETURN_URL);
  returnUrl.searchParams.set("tx_ref", txRef);

  let chapaResponse;

  try {
    chapaResponse = await axios.post(
      `${CHAPA_BASE_URL}/transaction/initialize`,
      {
        amount: amount.toString(),
        currency: "ETB",
        email: session.member.email,
        first_name: session.member.name?.split(" ")[0] || "Member",
        last_name: session.member.name?.split(" ").slice(1).join(" ") || "User",
        tx_ref: txRef,
        callback_url: CHAPA_CALLBACK_URL,
        return_url: returnUrl.toString(),
        customization: {
          title: "Trainer Session",
          description: `Payment for trainer session ${trainerSessionId}`,
        },
      },
      {
        headers: {
          Authorization: `Bearer ${CHAPA_SECRET_KEY}`,
          "Content-Type": "application/json",
        },
        timeout: 30000,
      },
    );
  } catch (error) {
    try {
      await prisma.$transaction(async (tx) => {
        await tx.payment.upsert({
          where: {
            trainerSessionId,
          },
          update: {
            amount,
            chapaTxRef: txRef,
            chapaCheckoutUrl: null,
            status: "failed",
          },
          create: {
            userId,
            trainerSessionId,
            amount,
            currency: "ETB",
            chapaTxRef: txRef,
            chapaCheckoutUrl: null,
            status: "failed",
          },
        });

        if (session.status === "PENDING_PAYMENT") {
          await tx.trainerSession.update({
            where: {
              id: trainerSessionId,
            },
            data: {
              status: "PAYMENT_FAILED",
            },
          });
        }
      });
    } catch (databaseError) {
      console.error("FAILED TO SAVE FAILED TRAINER PAYMENT:", databaseError);
    }

    throw new Error(getPaymentErrorMessage(error));
  }

  const checkoutUrl = chapaResponse.data?.data?.checkout_url;

  if (!checkoutUrl) {
    await prisma.$transaction(async (tx) => {
      await tx.payment.upsert({
        where: {
          trainerSessionId,
        },
        update: {
          amount,
          chapaTxRef: txRef,
          chapaCheckoutUrl: null,
          status: "failed",
        },
        create: {
          userId,
          trainerSessionId,
          amount,
          currency: "ETB",
          chapaTxRef: txRef,
          chapaCheckoutUrl: null,
          status: "failed",
        },
      });

      if (session.status === "PENDING_PAYMENT") {
        await tx.trainerSession.update({
          where: {
            id: trainerSessionId,
          },
          data: {
            status: "PAYMENT_FAILED",
          },
        });
      }
    });

    throw new Error("Chapa did not return checkout URL");
  }

  const payment = await prisma.payment.upsert({
    where: {
      trainerSessionId,
    },
    update: {
      amount,
      chapaTxRef: txRef,
      chapaCheckoutUrl: checkoutUrl,
      status: "pending",
      chapaRefundRef: null,
    },
    create: {
      userId,
      trainerSessionId,
      amount,
      currency: "ETB",
      chapaTxRef: txRef,
      chapaCheckoutUrl: checkoutUrl,
      status: "pending",
    },
  });

  await prisma.trainerSession.update({
    where: {
      id: trainerSessionId,
    },
    data: {
      chapaTxRef: txRef,
    },
  });

  return payment;
};

const verifyChapaTransaction = async (txRef) => {
  if (!CHAPA_SECRET_KEY) {
    throw new Error("CHAPA_SECRET_KEY is missing");
  }

  const response = await axios.get(
    `${CHAPA_BASE_URL}/transaction/verify/${encodeURIComponent(txRef)}`,
    {
      headers: {
        Authorization: `Bearer ${CHAPA_SECRET_KEY}`,
        "Content-Type": "application/json",
      },
      timeout: 30000,
    },
  );

  return response.data;
};

const refundChapaTransaction = async (txRef, amount, reason) => {
  if (!CHAPA_SECRET_KEY) {
    throw new Error("CHAPA_SECRET_KEY is missing");
  }

  const params = new URLSearchParams();

  params.append("reason", reason);
  params.append("amount", String(amount));
  params.append("reference", `refund-${txRef}`);

  const response = await axios.post(
    `${CHAPA_BASE_URL}/refund/${encodeURIComponent(txRef)}`,
    params.toString(),
    {
      headers: {
        Authorization: `Bearer ${CHAPA_SECRET_KEY}`,
        "Content-Type": "application/x-www-form-urlencoded",
      },
      timeout: 30000,
    },
  );

  return response.data;
};

const getCurrentPaymentResource = async (
  payment,
  extra = {},
  transaction = prisma,
) => {
  if (payment.bookingId) {
    const booking = await transaction.booking.findUnique({
      where: {
        id: payment.bookingId,
      },
    });

    return {
      payment,
      booking,
      trainerSession: null,
      ...extra,
    };
  }

  if (payment.trainerSessionId) {
    const trainerSession = await transaction.trainerSession.findUnique({
      where: {
        id: payment.trainerSessionId,
      },
    });

    return {
      payment,
      booking: null,
      trainerSession,
      ...extra,
    };
  }

  throw new Error("Payment is not linked to a booking or trainer session");
};

const processExpiredPaymentRefund = async (
  txRef,
  payment,
  resourceType,
  resourceId,
) => {
  const preparedPayment = await prisma.$transaction(async (tx) => {
    const currentPayment = await tx.payment.findUnique({
      where: {
        id: payment.id,
      },
    });

    if (!currentPayment) {
      throw new Error("Payment not found");
    }

    if (currentPayment.status === "refunded") {
      return currentPayment;
    }

    if (
      currentPayment.status === "refund_pending" &&
      currentPayment.chapaRefundRef
    ) {
      return currentPayment;
    }

    if (resourceType === "booking") {
      await tx.booking.update({
        where: {
          id: resourceId,
        },
        data: {
          status: "cancelled",
        },
      });
    }

    if (resourceType === "trainerSession") {
      await tx.trainerSession.update({
        where: {
          id: resourceId,
        },
        data: {
          status: "CANCELLED",
        },
      });
    }

    return tx.payment.update({
      where: {
        id: currentPayment.id,
      },
      data: {
        status: "refund_pending",
      },
    });
  });

  if (preparedPayment.status === "refunded") {
    return {
      payment: preparedPayment,
      refundStatus: "refunded",
      refundRef: preparedPayment.chapaRefundRef,
    };
  }

  if (
    preparedPayment.status === "refund_pending" &&
    preparedPayment.chapaRefundRef
  ) {
    return {
      payment: preparedPayment,
      refundStatus: "pending",
      refundRef: preparedPayment.chapaRefundRef,
    };
  }

  try {
    const refundResponse = await refundChapaTransaction(
      txRef,
      payment.amount,
      `${resourceType} ${resourceId} expired before payment was reconciled`,
    );

    const refundRef =
      refundResponse?.data?.ref_id ??
      refundResponse?.data?.reference ??
      refundResponse?.ref_id ??
      null;

    if (!refundRef) {
      throw new Error(
        "Chapa accepted the refund request but did not return a refund reference",
      );
    }

    const updatedPayment = await prisma.payment.update({
      where: {
        id: payment.id,
      },
      data: {
        status: "refunded",
        chapaRefundRef: String(refundRef),
      },
    });

    return {
      payment: updatedPayment,
      refundStatus: "refunded",
      refundRef: String(refundRef),
    };
  } catch (error) {
    console.error(
      "CHAPA REFUND FAILED:",
      error.response?.data || error.message,
    );

    const pendingPayment = await prisma.payment.findUnique({
      where: {
        id: payment.id,
      },
    });

    return {
      payment: pendingPayment,
      refundStatus: "manual_action_required",
      refundError: error.response?.data || error.message,
      refundRef: pendingPayment?.chapaRefundRef ?? null,
    };
  }
};

const processTrainerSessionPayment = async (txRef) => {
  const payment = await prisma.payment.findUnique({
    where: {
      chapaTxRef: txRef,
    },
    include: {
      trainerSession: true,
    },
  });

  if (!payment?.trainerSessionId) {
    return null;
  }

  return processPaymentResult(txRef);
};

const isValidWebhookSignature = (rawBody, signatureHeader) => {
  if (!rawBody) {
    console.error("Webhook raw body missing");
    return false;
  }

  if (!signatureHeader) {
    console.error("Webhook signature missing");
    return false;
  }

  if (!CHAPA_WEBHOOK_SECRET) {
    console.error("CHAPA_WEBHOOK_SECRET missing");
    return false;
  }

  const expectedHash = crypto
    .createHmac("sha256", CHAPA_WEBHOOK_SECRET)
    .update(rawBody)
    .digest("hex");

  const receivedSignature = String(signatureHeader).trim();

  if (expectedHash.length !== receivedSignature.length) {
    return false;
  }

  return crypto.timingSafeEqual(
    Buffer.from(expectedHash, "utf8"),
    Buffer.from(receivedSignature, "utf8"),
  );
};

const processPaymentResult = async (txRef) => {
  if (!txRef) {
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

  if (payment.status === "refunded") {
    return getCurrentPaymentResource(payment, {
      chapaStatus: "success",
      outcome: "refunded",
      refundStatus: "refunded",
      refundRef: payment.chapaRefundRef,
    });
  }

  if (payment.status === "refund_pending" && payment.chapaRefundRef) {
    return getCurrentPaymentResource(payment, {
      chapaStatus: "success",
      outcome: "refund_pending",
      refundStatus: "pending",
      refundRef: payment.chapaRefundRef,
    });
  }

  const verification = await verifyChapaTransaction(txRef);
  const chapaData = verification?.data;

  if (!chapaData) {
    throw new Error("Invalid Chapa verification response");
  }

  const chapaStatus = String(chapaData.status || "").toLowerCase();

  const chapaTxRef = chapaData.tx_ref || chapaData.trx_ref;

  if (chapaTxRef && chapaTxRef !== txRef) {
    throw new Error("Chapa transaction reference mismatch");
  }

  if (chapaStatus === "success") {
    const chapaAmount = Number(chapaData.amount);
    const localAmount = Number(payment.amount);

    if (
      !Number.isFinite(chapaAmount) ||
      !Number.isFinite(localAmount) ||
      chapaAmount !== localAmount
    ) {
      throw new Error(
        `Payment amount mismatch. Expected ${localAmount}, received ${chapaAmount}`,
      );
    }

    const chapaCurrency = String(chapaData.currency || "").toUpperCase();

    const localCurrency = String(payment.currency || "ETB").toUpperCase();

    if (chapaCurrency && chapaCurrency !== localCurrency) {
      throw new Error(
        `Payment currency mismatch. Expected ${localCurrency}, received ${chapaCurrency}`,
      );
    }
  }

  let outcome = "pending";

  if (chapaStatus === "success") {
    outcome = "success";
  } else if (
    chapaStatus === "failed" ||
    chapaStatus === "cancelled" ||
    chapaStatus === "failed/cancelled"
  ) {
    outcome = "failed";
  }

  if (outcome === "pending") {
    return getCurrentPaymentResource(payment, {
      chapaStatus,
      outcome,
    });
  }

  if (outcome === "failed") {
    return prisma.$transaction(async (tx) => {
      const currentPayment = await tx.payment.findUnique({
        where: {
          id: payment.id,
        },
      });

      if (!currentPayment) {
        throw new Error("Payment not found");
      }

      if (
        currentPayment.status === "success" ||
        currentPayment.status === "refunded" ||
        currentPayment.status === "refund_pending"
      ) {
        return getCurrentPaymentResource(
          currentPayment,
          {
            chapaStatus,
            outcome: currentPayment.status,
          },
          tx,
        );
      }

      if (currentPayment.bookingId) {
        const booking = await tx.booking.findUnique({
          where: {
            id: currentPayment.bookingId,
          },
        });

        if (!booking) {
          throw new Error("Booking not found");
        }

        const nextStatus =
          bookingTransitionsFromPayment[booking.status]?.failed;

        if (!nextStatus) {
          throw new Error(
            `No valid transition from booking status "${booking.status}" for payment outcome "failed"`,
          );
        }

        const updatedPayment = await tx.payment.update({
          where: {
            id: currentPayment.id,
          },
          data: {
            status: "failed",
          },
        });

        const updatedBooking = await tx.booking.update({
          where: {
            id: booking.id,
          },
          data: {
            status: nextStatus,
          },
        });

        return {
          payment: updatedPayment,
          booking: updatedBooking,
          trainerSession: null,
          chapaStatus,
          outcome,
        };
      }

      if (currentPayment.trainerSessionId) {
        const session = await tx.trainerSession.findUnique({
          where: {
            id: currentPayment.trainerSessionId,
          },
        });

        if (!session) {
          throw new Error("Trainer session not found");
        }

        const nextStatus =
          trainerSessionTransitionsFromPayment[session.status]?.failed;

        if (!nextStatus) {
          throw new Error(
            `No valid transition from trainer session status "${session.status}" for payment outcome "failed"`,
          );
        }

        const updatedPayment = await tx.payment.update({
          where: {
            id: currentPayment.id,
          },
          data: {
            status: "failed",
          },
        });

        const updatedSession = await tx.trainerSession.update({
          where: {
            id: session.id,
          },
          data: {
            status: nextStatus,
          },
        });

        return {
          payment: updatedPayment,
          booking: null,
          trainerSession: updatedSession,
          chapaStatus,
          outcome,
        };
      }

      throw new Error("Payment is not linked to a booking or trainer session");
    });
  }

  if (payment.bookingId) {
    const booking = await prisma.booking.findUnique({
      where: {
        id: payment.bookingId,
      },
    });

    if (!booking) {
      throw new Error("Booking not found");
    }

    const bookingUnavailable =
      booking.status === "cancelled" ||
      (isBookingExpired(booking) &&
        (booking.status === "pending" || booking.status === "payment_failed"));

    if (bookingUnavailable) {
      const refundResult = await processExpiredPaymentRefund(
        txRef,
        payment,
        "booking",
        booking.id,
      );

      return {
        payment: refundResult.payment,
        booking: {
          ...booking,
          status: "cancelled",
        },
        trainerSession: null,
        chapaStatus,
        outcome:
          refundResult.refundStatus === "refunded"
            ? "refunded"
            : "refund_pending",
        refundStatus: refundResult.refundStatus,
        refundRef: refundResult.refundRef ?? null,
        refundError: refundResult.refundError ?? null,
        requiresRefund: refundResult.refundStatus !== "refunded",
      };
    }

    return prisma.$transaction(async (tx) => {
      const currentPayment = await tx.payment.findUnique({
        where: {
          id: payment.id,
        },
      });

      if (!currentPayment) {
        throw new Error("Payment not found");
      }

      if (currentPayment.status === "success") {
        const currentBooking = await tx.booking.findUnique({
          where: {
            id: currentPayment.bookingId,
          },
        });

        return {
          payment: currentPayment,
          booking: currentBooking,
          trainerSession: null,
          chapaStatus,
          outcome: "success",
        };
      }

      if (
        currentPayment.status === "refunded" ||
        currentPayment.status === "refund_pending"
      ) {
        return getCurrentPaymentResource(
          currentPayment,
          {
            chapaStatus,
            outcome: currentPayment.status,
          },
          tx,
        );
      }

      const currentBooking = await tx.booking.findUnique({
        where: {
          id: currentPayment.bookingId,
        },
      });

      if (!currentBooking) {
        throw new Error("Booking not found");
      }

      const currentBookingUnavailable =
        currentBooking.status === "cancelled" ||
        (isBookingExpired(currentBooking) &&
          (currentBooking.status === "pending" ||
            currentBooking.status === "payment_failed"));

      if (currentBookingUnavailable) {
        await tx.booking.update({
          where: {
            id: currentBooking.id,
          },
          data: {
            status: "cancelled",
          },
        });

        const pendingRefundPayment = await tx.payment.update({
          where: {
            id: currentPayment.id,
          },
          data: {
            status: "refund_pending",
          },
        });

        return {
          payment: pendingRefundPayment,
          booking: {
            ...currentBooking,
            status: "cancelled",
          },
          trainerSession: null,
          chapaStatus,
          outcome: "refund_pending",
          requiresRefund: true,
        };
      }

      const nextStatus =
        bookingTransitionsFromPayment[currentBooking.status]?.success;

      if (!nextStatus) {
        throw new Error(
          `No valid transition from booking status "${currentBooking.status}" for payment outcome "success"`,
        );
      }

      const bookingData = {
        status: nextStatus,
      };

      if (nextStatus === "confirmed" && !currentBooking.qrCode) {
        bookingData.qrCode = crypto.randomUUID();
      }

      const updatedPayment = await tx.payment.update({
        where: {
          id: currentPayment.id,
        },
        data: {
          status: "success",
        },
      });

      const updatedBooking = await tx.booking.update({
        where: {
          id: currentBooking.id,
        },
        data: bookingData,
      });

      return {
        payment: updatedPayment,
        booking: updatedBooking,
        trainerSession: null,
        chapaStatus,
        outcome: "success",
      };
    });
  }

  if (payment.trainerSessionId) {
    const session = await prisma.trainerSession.findUnique({
      where: {
        id: payment.trainerSessionId,
      },
    });

    if (!session) {
      throw new Error("Trainer session not found");
    }

    const sessionUnavailable =
      session.status === "CANCELLED" ||
      (isTrainerSessionExpired(session) &&
        (session.status === "PENDING_PAYMENT" ||
          session.status === "PAYMENT_FAILED"));

    if (sessionUnavailable) {
      const refundResult = await processExpiredPaymentRefund(
        txRef,
        payment,
        "trainerSession",
        session.id,
      );

      return {
        payment: refundResult.payment,
        booking: null,
        trainerSession: {
          ...session,
          status: "CANCELLED",
        },
        chapaStatus,
        outcome:
          refundResult.refundStatus === "refunded"
            ? "refunded"
            : "refund_pending",
        refundStatus: refundResult.refundStatus,
        refundRef: refundResult.refundRef ?? null,
        refundError: refundResult.refundError ?? null,
        requiresRefund: refundResult.refundStatus !== "refunded",
      };
    }

    return prisma.$transaction(async (tx) => {
      const currentPayment = await tx.payment.findUnique({
        where: {
          id: payment.id,
        },
      });

      if (!currentPayment) {
        throw new Error("Payment not found");
      }

      if (currentPayment.status === "success") {
        const existingSession = await tx.trainerSession.findUnique({
          where: {
            id: currentPayment.trainerSessionId,
          },
        });

        return {
          payment: currentPayment,
          booking: null,
          trainerSession: existingSession,
          chapaStatus,
          outcome: "success",
        };
      }

      if (
        currentPayment.status === "refunded" ||
        currentPayment.status === "refund_pending"
      ) {
        return getCurrentPaymentResource(
          currentPayment,
          {
            chapaStatus,
            outcome: currentPayment.status,
          },
          tx,
        );
      }

      const currentSession = await tx.trainerSession.findUnique({
        where: {
          id: currentPayment.trainerSessionId,
        },
      });

      if (!currentSession) {
        throw new Error("Trainer session not found");
      }

      const currentSessionUnavailable =
        currentSession.status === "CANCELLED" ||
        (isTrainerSessionExpired(currentSession) &&
          (currentSession.status === "PENDING_PAYMENT" ||
            currentSession.status === "PAYMENT_FAILED"));

      if (currentSessionUnavailable) {
        await tx.trainerSession.update({
          where: {
            id: currentSession.id,
          },
          data: {
            status: "CANCELLED",
          },
        });

        const pendingRefundPayment = await tx.payment.update({
          where: {
            id: currentPayment.id,
          },
          data: {
            status: "refund_pending",
          },
        });

        return {
          payment: pendingRefundPayment,
          booking: null,
          trainerSession: {
            ...currentSession,
            status: "CANCELLED",
          },
          chapaStatus,
          outcome: "refund_pending",
          requiresRefund: true,
        };
      }

      const nextStatus =
        trainerSessionTransitionsFromPayment[currentSession.status]?.success;

      if (!nextStatus) {
        throw new Error(
          `No valid transition from trainer session status "${currentSession.status}" for payment outcome "success"`,
        );
      }

      const updatedPayment = await tx.payment.update({
        where: {
          id: currentPayment.id,
        },
        data: {
          status: "success",
        },
      });

      const updatedSession = await tx.trainerSession.update({
        where: {
          id: currentSession.id,
        },
        data: {
          status: nextStatus,
        },
      });

      return {
        payment: updatedPayment,
        booking: null,
        trainerSession: updatedSession,
        chapaStatus,
        outcome: "success",
      };
    });
  }

  throw new Error("Payment is not linked to a booking or trainer session");
};

const checkPaymentStatus = async (txRef, userId) => {
  const payment = await prisma.payment.findUnique({
    where: {
      chapaTxRef: txRef,
    },
    include: {
      booking: true,
      trainerSession: true,
    },
  });

  if (!payment) {
    throw new Error("Payment not found");
  }

  if (payment.userId !== userId) {
    throw new Error("Access denied");
  }

  if (payment.status === "refunded") {
    return {
      localStatus: "refunded",
      chapaStatus: "success",
      bookingStatus: payment.booking?.status ?? null,
      trainerSessionStatus: payment.trainerSession?.status ?? null,
      bookingId: payment.bookingId ?? null,
      trainerSessionId: payment.trainerSessionId ?? null,
      qrCode: payment.booking?.qrCode ?? null,
      expired: true,
      refundStatus: "refunded",
      refundRef: payment.chapaRefundRef ?? null,
    };
  }

  if (payment.status === "refund_pending") {
    return {
      localStatus: "refund_pending",
      chapaStatus: "success",
      bookingStatus: payment.booking?.status ?? null,
      trainerSessionStatus: payment.trainerSession?.status ?? null,
      bookingId: payment.bookingId ?? null,
      trainerSessionId: payment.trainerSessionId ?? null,
      qrCode: payment.booking?.qrCode ?? null,
      expired: true,
      refundStatus: payment.chapaRefundRef
        ? "pending"
        : "manual_action_required",
      refundRef: payment.chapaRefundRef ?? null,
    };
  }

  let chapaStatus = null;

  try {
    const verification = await verifyChapaTransaction(txRef);

    chapaStatus = verification?.data?.status ?? null;
  } catch (error) {
    console.error("Chapa verify failed:", error.message);

    return {
      localStatus: payment.status,
      chapaStatus: null,
      bookingStatus: payment.booking?.status ?? null,
      trainerSessionStatus: payment.trainerSession?.status ?? null,
      bookingId: payment.bookingId ?? null,
      trainerSessionId: payment.trainerSessionId ?? null,
      qrCode: payment.booking?.qrCode ?? null,
      expired: false,
    };
  }

  chapaStatus = String(chapaStatus).toLowerCase();

  if (
    chapaStatus === "success" ||
    chapaStatus === "failed" ||
    chapaStatus === "cancelled" ||
    chapaStatus === "failed/cancelled"
  ) {
    const result = await processPaymentResult(txRef);

    return {
      localStatus: result.payment.status,
      chapaStatus,
      bookingStatus: result.booking?.status ?? null,
      trainerSessionStatus: result.trainerSession?.status ?? null,
      bookingId: payment.bookingId ?? null,
      trainerSessionId: payment.trainerSessionId ?? null,
      qrCode: result.booking?.qrCode ?? null,
      expired:
        result.outcome === "refund_pending" || result.outcome === "refunded",
      refundStatus: result.refundStatus ?? null,
      refundRef: result.refundRef ?? result.payment.chapaRefundRef ?? null,
      requiresRefund: result.requiresRefund ?? false,
    };
  }

  return {
    localStatus: payment.status,
    chapaStatus,
    bookingStatus: payment.booking?.status ?? null,
    trainerSessionStatus: payment.trainerSession?.status ?? null,
    bookingId: payment.bookingId ?? null,
    trainerSessionId: payment.trainerSessionId ?? null,
    qrCode: payment.booking?.qrCode ?? null,
    expired: false,
  };
};

const handleChapaWebhook = async (payload, rawBody, signatureHeader) => {
  if (!isValidWebhookSignature(rawBody, signatureHeader)) {
    throw new Error("Invalid webhook signature");
  }

  const txRef =
    payload?.tx_ref ??
    payload?.trx_ref ??
    payload?.data?.tx_ref ??
    payload?.data?.trx_ref;

  if (!txRef) {
    throw new Error("Transaction reference missing from webhook");
  }

  return processPaymentResult(txRef);
};

const handleChapaCallback = async (txRef) => {
  if (!txRef) {
    throw new Error("Transaction reference is required");
  }

  return processPaymentResult(txRef);
};

module.exports = {
  initializePayment,
  initializeTrainerSessionPayment,
  verifyChapaTransaction,
  refundChapaTransaction,
  checkPaymentStatus,
  processPaymentResult,
  processTrainerSessionPayment,
  handleChapaWebhook,
  handleChapaCallback,
  isValidWebhookSignature,
};
