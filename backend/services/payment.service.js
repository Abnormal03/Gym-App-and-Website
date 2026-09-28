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

const getPaymentErrorMessage = (error) => {
  const responseData = error.response?.data;
  const message = responseData?.message ?? responseData?.error ?? responseData;

  if (typeof message === "string" && message.trim()) {
    return message;
  }

  if (message && typeof message === "object") {
    try {
      return JSON.stringify(message);
    } catch (serializationError) {
      return error.message;
    }
  }

  return error.message || "Chapa payment initialization failed";
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

  if (!booking.package) {
    throw new Error("Booking has no package");
  }

  if (!booking.user) {
    throw new Error("Booking user not found");
  }

  const amount = Number(booking.package.price);

  if (!amount || amount <= 0) {
    throw new Error("Invalid payment amount");
  }

  const txRef = `booking-${bookingId}-${Date.now()}`;

  if (!CHAPA_CALLBACK_URL || !CHAPA_RETURN_URL) {
    throw new Error("Chapa callback and return URLs must be configured");
  }

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

  if (!session.member) {
    throw new Error("Trainer session member not found");
  }

  if (!session.trainer) {
    throw new Error("Trainer not found");
  }

  const amount = Number(session.price);

  if (!amount || amount <= 0) {
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

  const expectedBuffer = Buffer.from(expectedHash, "utf8");

  const receivedBuffer = Buffer.from(signatureHeader, "utf8");

  if (expectedBuffer.length !== receivedBuffer.length) {
    return false;
  }

  return crypto.timingSafeEqual(expectedBuffer, receivedBuffer);
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

  if (payment.status === "success") {
    if (payment.bookingId) {
      const booking = await prisma.booking.findUnique({
        where: {
          id: payment.bookingId,
        },
      });

      return {
        payment,
        booking,
        trainerSession: null,
        chapaStatus: "success",
        outcome: "success",
      };
    }

    if (payment.trainerSessionId) {
      const trainerSession = await prisma.trainerSession.findUnique({
        where: {
          id: payment.trainerSessionId,
        },
      });

      return {
        payment,
        booking: null,
        trainerSession,
        chapaStatus: "success",
        outcome: "success",
      };
    }
  }

  const verification = await verifyChapaTransaction(txRef);

  const chapaStatus = verification?.data?.status || null;

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

  console.log(
    "PAYMENT OUTCOME:",
    outcome,
    "TYPE:",
    payment.bookingId ? "GYM_BOOKING" : "TRAINER_SESSION",
  );

  if (outcome === "pending") {
    if (payment.bookingId) {
      const booking = await prisma.booking.findUnique({
        where: {
          id: payment.bookingId,
        },
      });

      return {
        payment,
        booking,
        trainerSession: null,
        chapaStatus,
        outcome,
      };
    }

    if (payment.trainerSessionId) {
      const trainerSession = await prisma.trainerSession.findUnique({
        where: {
          id: payment.trainerSessionId,
        },
      });

      return {
        payment,
        booking: null,
        trainerSession,
        chapaStatus,
        outcome,
      };
    }

    throw new Error("Payment is not linked to a booking or trainer session");
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
      if (currentPayment.bookingId) {
        const existingBooking = await tx.booking.findUnique({
          where: {
            id: currentPayment.bookingId,
          },
        });

        return {
          payment: currentPayment,
          booking: existingBooking,
          trainerSession: null,
          chapaStatus,
          outcome: "success",
        };
      }

      if (currentPayment.trainerSessionId) {
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
        bookingTransitionsFromPayment[booking.status]?.[outcome];

      if (!nextStatus) {
        throw new Error(
          `No valid transition from booking status "${booking.status}" ` +
            `for payment outcome "${outcome}"`,
        );
      }

      const updatedPayment = await tx.payment.update({
        where: {
          id: currentPayment.id,
        },

        data: {
          status: outcome,
        },
      });

      const bookingData = {
        status: nextStatus,
      };

      if (outcome === "success" && !booking.qrCode) {
        bookingData.qrCode = crypto.randomUUID();
      }

      const updatedBooking = await tx.booking.update({
        where: {
          id: currentPayment.bookingId,
        },

        data: bookingData,
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
      const trainerSession = await tx.trainerSession.findUnique({
        where: {
          id: currentPayment.trainerSessionId,
        },
      });

      if (!trainerSession) {
        throw new Error("Trainer session not found");
      }

      const nextStatus =
        trainerSessionTransitionsFromPayment[trainerSession.status]?.[outcome];

      if (!nextStatus) {
        throw new Error(
          `No valid transition from trainer session status ` +
            `"${trainerSession.status}" for payment outcome "${outcome}"`,
        );
      }

      const updatedPayment = await tx.payment.update({
        where: {
          id: currentPayment.id,
        },

        data: {
          status: outcome,
        },
      });

      const updatedTrainerSession = await tx.trainerSession.update({
        where: {
          id: trainerSession.id,
        },

        data: {
          status: nextStatus,
        },
      });

      return {
        payment: updatedPayment,
        booking: null,
        trainerSession: updatedTrainerSession,
        chapaStatus,
        outcome,
      };
    }

    throw new Error("Payment is not linked to a booking or trainer session");
  });
};

const handleChapaWebhook = async (rawBody, signatureHeader) => {
  const validSignature = isValidWebhookSignature(rawBody, signatureHeader);

  if (!validSignature) {
    throw new Error("Invalid webhook signature");
  }

  let event;

  try {
    event = JSON.parse(rawBody.toString("utf8"));
  } catch (error) {
    throw new Error("Invalid webhook JSON");
  }

  const txRef = event?.tx_ref || event?.trx_ref;

  if (!txRef) {
    throw new Error("Webhook payload missing tx_ref");
  }

  return processPaymentResult(txRef);
};

const EXPIRY_MINUTES = 30;

const handleChapaCallback = async (txRef) => {
  if (!txRef) {
    throw new Error("Transaction reference is required");
  }

  return processPaymentResult(txRef);
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

  if (payment.bookingId && payment.booking) {
    const booking = payment.booking;

    if (payment.status === "pending" && booking.status === "pending") {
      const expiresAt = new Date(
        booking.createdAt.getTime() + EXPIRY_MINUTES * 60 * 1000,
      );

      if (new Date() > expiresAt) {
        await prisma.$transaction([
          prisma.booking.update({
            where: {
              id: payment.bookingId,
            },

            data: {
              status: "cancelled",
            },
          }),

          prisma.payment.update({
            where: {
              id: payment.id,
            },

            data: {
              status: "failed",
            },
          }),
        ]);

        return {
          localStatus: "failed",
          chapaStatus: null,
          bookingStatus: "cancelled",
          trainerSessionStatus: null,
          bookingId: payment.bookingId,
          trainerSessionId: null,
          qrCode: null,
          expired: true,
        };
      }
    }
  }

  if (payment.trainerSessionId && payment.trainerSession) {
    const session = payment.trainerSession;

    if (payment.status === "success" && session.status !== "CONFIRMED") {
      return {
        localStatus: payment.status,
        chapaStatus: "success",
        bookingStatus: null,
        trainerSessionStatus: session.status,
        bookingId: null,
        trainerSessionId: session.id,
        qrCode: null,
        expired: false,
      };
    }
  }

  let chapaStatus = null;

  try {
    const verification = await verifyChapaTransaction(txRef);

    chapaStatus = verification?.data?.status ?? null;
  } catch (error) {
    console.error("Chapa verify failed:", error.message);
  }

  if (chapaStatus === "success" && payment.status === "pending") {
    const result = await processPaymentResult(txRef);

    if (payment.bookingId) {
      return {
        localStatus: result.payment.status,
        chapaStatus,
        bookingStatus: result.booking?.status ?? null,
        trainerSessionStatus: null,
        bookingId: payment.bookingId,
        trainerSessionId: null,
        qrCode: result.booking?.qrCode ?? null,
        expired: false,
      };
    }

    if (payment.trainerSessionId) {
      return {
        localStatus: result.payment.status,
        chapaStatus,
        bookingStatus: null,
        trainerSessionStatus: result.trainerSession?.status ?? null,
        bookingId: null,
        trainerSessionId: payment.trainerSessionId,
        qrCode: null,
        expired: false,
      };
    }
  }

  if (payment.bookingId) {
    const freshBooking = await prisma.booking.findUnique({
      where: {
        id: payment.bookingId,
      },
    });

    return {
      localStatus: payment.status,
      chapaStatus,
      bookingStatus: freshBooking?.status ?? null,
      trainerSessionStatus: null,
      bookingId: payment.bookingId,
      trainerSessionId: null,
      qrCode: freshBooking?.qrCode ?? null,
      expired: false,
    };
  }

  if (payment.trainerSessionId) {
    const freshSession = await prisma.trainerSession.findUnique({
      where: {
        id: payment.trainerSessionId,
      },
    });

    return {
      localStatus: payment.status,
      chapaStatus,
      bookingStatus: null,
      trainerSessionStatus: freshSession?.status ?? null,
      bookingId: null,
      trainerSessionId: payment.trainerSessionId,
      qrCode: null,
      expired: false,
    };
  }

  throw new Error("Payment is not linked to a booking or trainer session");
};

module.exports = {
  initializePayment,
  initializeTrainerSessionPayment,
  verifyChapaTransaction,
  checkPaymentStatus,
  processPaymentResult,
  handleChapaWebhook,
  handleChapaCallback,
};
