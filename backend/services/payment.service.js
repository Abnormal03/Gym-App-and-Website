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
  console.log("========================================");
  console.log("========== PAYMENT INITIALIZATION ======");
  console.log("========================================");

  console.log("BOOKING ID:", bookingId);
  console.log("USER ID:", userId);

  if (!CHAPA_SECRET_KEY) {
    throw new Error("CHAPA_SECRET_KEY is missing");
  }

  console.log("STEP 1: Finding booking...");

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

  console.log("STEP 2: Booking query completed");

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

  console.log("STEP 3: Amount:", amount);

  const txRef = `booking-${bookingId}-${Date.now()}`;

  console.log("STEP 4: TX REF:", txRef);

  console.log("CALLBACK URL:", CHAPA_CALLBACK_URL);
  console.log("RETURN URL:", CHAPA_RETURN_URL);
  let chapaResponse;

  try {
    console.log("STEP 5: Sending request to Chapa...");

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

    console.log("STEP 6: Chapa response received");

    console.log("CHAPA RESPONSE:", JSON.stringify(chapaResponse.data, null, 2));
  } catch (error) {
    console.error("========================================");
    console.error("CHAPA INITIALIZATION FAILED");
    console.error("========================================");

    console.error("STATUS:", error.response?.status);

    console.error("DATA:", error.response?.data);

    console.error("MESSAGE:", error.message);

    try {
      console.log("Saving failed payment...");

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

      console.log("FAILED PAYMENT + BOOKING SAVED");
    } catch (databaseError) {
      console.error("FAILED TO SAVE FAILED PAYMENT:", databaseError);
    }

    throw new Error(
      error.response?.data?.message || "Chapa payment initialization failed",
    );
  }

  const checkoutUrl = chapaResponse.data?.data?.checkout_url;

  if (!checkoutUrl) {
    console.error("Chapa response did not contain checkout URL");
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

  console.log("STEP 7: Checkout URL received");

  console.log("CHECKOUT URL:", checkoutUrl);

  console.log("STEP 8: Saving pending payment...");

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

  console.log("STEP 9: PAYMENT SAVED");

  console.log("PAYMENT:", payment);

  return payment;
};

const verifyChapaTransaction = async (txRef) => {
  console.log("========== VERIFY CHAPA TRANSACTION ==========");

  console.log("TX REF:", txRef);

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

  console.log("CHAPA VERIFY RESPONSE:", JSON.stringify(response.data, null, 2));

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

  console.log("EXPECTED SIGNATURE:", expectedHash);

  console.log("RECEIVED SIGNATURE:", signatureHeader);

  const expectedBuffer = Buffer.from(expectedHash, "utf8");

  const receivedBuffer = Buffer.from(signatureHeader, "utf8");

  if (expectedBuffer.length !== receivedBuffer.length) {
    return false;
  }

  return crypto.timingSafeEqual(expectedBuffer, receivedBuffer);
};

const processPaymentResult = async (txRef) => {
  console.log("========== PROCESS PAYMENT RESULT ==========");

  console.log("TX REF:", txRef);

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

  console.log("LOCAL PAYMENT:", payment);

  if (payment.status === "success") {
    console.log("Payment already marked successful");

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

  console.log("CHAPA STATUS:", chapaStatus);

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

    console.log("CURRENT BOOKING STATUS:", booking.status);

    const nextStatus = bookingTransitionsFromPayment[booking.status]?.[outcome];

    console.log("NEXT BOOKING STATUS:", nextStatus);

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

    console.log("UPDATED PAYMENT:", updatedPayment);

    console.log("UPDATED BOOKING:", updatedBooking);

    return {
      payment: updatedPayment,
      booking: updatedBooking,
      chapaStatus,
      outcome,
    };
  });
};

const handleChapaWebhook = async (rawBody, signatureHeader) => {
  console.log("========== HANDLE CHAPA WEBHOOK ==========");

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

  console.log("CHAPA WEBHOOK EVENT:", JSON.stringify(event, null, 2));
  const txRef = event?.tx_ref || event?.trx_ref;

  if (!txRef) {
    throw new Error("Webhook payload missing tx_ref");
  }

  console.log("WEBHOOK TX REF:", txRef);
  const result = await processPaymentResult(txRef);

  console.log("FINAL WEBHOOK RESULT:", result);

  return result;
};

const checkPaymentStatus = async (txRef, userId) => {
  console.log("========== CHECK PAYMENT STATUS ==========");
  console.log("TX REF:", txRef);
  console.log("USER ID:", userId);

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
