const axios = require("axios");
const crypto = require("crypto");
const prisma = require("../config/prisma");
const {
  bookingTransitionsFromPayment,
} = require("../config/bookingTransitions");

const CHAPA_BASE_URL = "https://api.chapa.co/v1";

const CHAPA_SECRET_KEY = process.env.CHAPA_SECRET_KEY;
const CHAPA_WEBHOOK_SECRET = process.env.CHAPA_WEBHOOK_SECRET;
const CHAPA_CALLBACK_URL = process.env.CHAPA_CALLBACK_URL;
const CHAPA_RETURN_URL = process.env.CHAPA_RETURN_URL;

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

  console.log("BOOKING:", {
    id: booking.id,
    userId: booking.userId,
    status: booking.status,
    packageId: booking.packageId,
  });

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

        return_url: CHAPA_RETURN_URL,

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

    throw new Error(
      error.response?.data?.message || "Chapa payment initialization failed",
    );
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
  const payment = await prisma.payment.upsert({
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
    const booking = await prisma.booking.findUnique({
      where: {
        id: payment.bookingId,
      },
    });

    return {
      payment,
      booking,
      chapaStatus: "success",
      outcome: "success",
    };
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

  console.log("PAYMENT OUTCOME:", outcome);

  if (outcome === "pending") {
    const booking = await prisma.booking.findUnique({
      where: {
        id: payment.bookingId,
      },
    });

    return {
      payment,
      booking,
      chapaStatus,
      outcome,
    };
  }

  return await prisma.$transaction(async (tx) => {
    const currentPayment = await tx.payment.findUnique({
      where: {
        id: payment.id,
      },
    });

    if (!currentPayment) {
      throw new Error("Payment not found");
    }

    if (currentPayment.status === "success") {
      const existingBooking = await tx.booking.findUnique({
        where: {
          id: currentPayment.bookingId,
        },
      });

      return {
        payment: currentPayment,
        booking: existingBooking,
        chapaStatus,
        outcome: "success",
      };
    }

    const booking = await tx.booking.findUnique({
      where: {
        id: currentPayment.bookingId,
      },
    });

    if (!booking) {
      throw new Error("Booking not found");
    }
    const nextStatus = bookingTransitionsFromPayment[booking.status]?.[outcome];

    if (!nextStatus) {
      console.error(
        `UNHANDLED BOOKING TRANSITION: booking ${booking.id} is in status "${booking.status}", ` +
        `no transition defined for payment outcome "${outcome}". Aborting so payment status ` +
        `is not updated without a matching booking update.`,
      );

      throw new Error(
        `No valid transition from booking status "${booking.status}" for payment outcome "${outcome}"`,
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
      chapaStatus,
      outcome,
    };
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
  const result = await processPaymentResult(txRef);

  return result;
};

const checkPaymentStatus = async (txRef, userId) => {

  const payment = await prisma.payment.findUnique({
    where: { chapaTxRef: txRef },
  });

  if (!payment) {
    throw new Error(`Payment not found for tx_ref: ${txRef}`);
  }

  if (payment.userId !== userId) {
    throw new Error("Access denied");
  }

  const verification = await verifyChapaTransaction(txRef);

  const booking = await prisma.booking.findUnique({
    where: { id: payment.bookingId },
  });

  return {
    localStatus: payment.status,
    chapaStatus: verification?.data?.status ?? null,
    bookingStatus: booking?.status ?? null,
    qrCode: booking?.qrCode ?? null,
  };
};
module.exports = {
  initializePayment,
  verifyChapaTransaction,
  checkPaymentStatus,
  processPaymentResult,
  handleChapaWebhook,
};
