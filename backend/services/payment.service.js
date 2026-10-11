const axios = require("axios");
const crypto = require("crypto");
const prisma = require("../config/prisma");

const {
  bookingTransitionsFromPayment,
  allowedTransitions,
} = require("../config/bookingTransitions");

const {
  getOrderExpiryMinutes,
  expireStale,
} = require("./bookingHelpers.service");

const CHAPA_BASE_URL = "https://api.chapa.co/v1";

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

const getChapaStatus = (verification) =>
  String(verification?.data?.status ?? "").toLowerCase();

const getPaymentOutcome = (status) => {
  if (status === "success") {
    return "success";
  }

  if (
    status === "failed" ||
    status === "cancelled" ||
    status === "failed/cancelled"
  ) {
    return "failed";
  }

  return "pending";
};

const validateId = (value, fieldName = "ID") => {
  const id = Number(value);

  if (!Number.isSafeInteger(id) || id <= 0) {
    throw new Error(`Invalid ${fieldName}`);
  }

  return id;
};

/**
 * Record a payment initialization failure without overwriting a
 * booking that has already reached a different state.
 */
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
        currency: "ETB",
        chapaTxRef: txRef,
        chapaCheckoutUrl: null,
        status: "failed",
      },
    });

    const nextStatus = bookingTransitionsFromPayment[booking.status]?.failed;

    let updatedBooking = booking;

    if (nextStatus && nextStatus !== booking.status) {
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

/**
 * Initialize a Chapa checkout for an existing booking.
 */
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

  // Never create a second checkout for a payment already recorded as paid.
  if (booking.payment?.status === "success") {
    throw new Error("This booking has already been paid");
  }

  const amount = Number(booking.package.price);

  if (!Number.isFinite(amount) || amount <= 0) {
    throw new Error("Invalid payment amount");
  }

  const txRef = `booking-${bookingId}-${Date.now()}-${crypto
    .randomUUID()
    .slice(0, 8)}`;

  const returnUrl = new URL(process.env.CHAPA_RETURN_URL);
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
        callback_url: process.env.CHAPA_CALLBACK_URL,
        return_url: returnUrl.toString(),
        customization: {
          title: "Gym Booking",
          description: `Payment for booking ${bookingId}`,
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

    if (
      currentBooking.status !== "pending" &&
      currentBooking.status !== "payment_failed"
    ) {
      throw new Error(
        `Cannot pay for a booking with status ${currentBooking.status}`,
      );
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

/**
 * Verify a transaction directly with Chapa.
 */
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

/**
 * Validate the HMAC signature of the exact raw webhook body.
 */
const isValidWebhookSignature = (rawBody, signatureHeader) => {
  if (!rawBody || !signatureHeader || !process.env.CHAPA_WEBHOOK_SECRET) {
    return false;
  }

  const expectedHash = crypto
    .createHmac("sha256", process.env.CHAPA_WEBHOOK_SECRET)
    .update(rawBody)
    .digest("hex");

  const expectedBuffer = Buffer.from(expectedHash, "utf8");
  const receivedBuffer = Buffer.from(String(signatureHeader), "utf8");

  if (expectedBuffer.length !== receivedBuffer.length) {
    return false;
  }

  return crypto.timingSafeEqual(expectedBuffer, receivedBuffer);
};

/**
 * Apply a verified Chapa result exactly once as far as local state allows.
 *
 * Late successful payments do not revive cancelled or expired bookings.
 * They are recorded as successful and flagged for manual refund handling.
 */
const processPaymentResult = async (txRef) => {
  if (typeof txRef !== "string" || !txRef.trim()) {
    throw new Error("Transaction reference is required");
  }

  const payment = await prisma.payment.findUnique({
    where: { chapaTxRef: txRef },
  });

  if (!payment) {
    throw new Error(`Payment not found for tx_ref: ${txRef}`);
  }

  const verification = await verifyChapaTransaction(txRef);
  const chapaStatus = getChapaStatus(verification);
  const outcome = getPaymentOutcome(chapaStatus);

  if (outcome === "pending") {
    const currentPayment = await prisma.payment.findUnique({
      where: { id: payment.id },
      include: { booking: true },
    });

    return {
      payment: currentPayment,
      booking: currentPayment?.booking ?? null,
      chapaStatus,
      outcome,
    };
  }

  return prisma.$transaction(async (tx) => {
    const currentPayment = await tx.payment.findUnique({
      where: { id: payment.id },
    });

    if (!currentPayment) {
      throw new Error("Payment not found");
    }

    const booking = await tx.booking.findUnique({
      where: { id: currentPayment.bookingId },
    });

    if (!booking) {
      throw new Error("Booking not found");
    }

    // A previously recorded successful payment must not be processed twice.
    if (currentPayment.status === "success") {
      return {
        payment: currentPayment,
        booking,
        chapaStatus,
        outcome: "success",
      };
    }

    if (outcome === "failed") {
      const nextStatus = bookingTransitionsFromPayment[booking.status]?.failed;

      const updatedPayment = await tx.payment.update({
        where: { id: currentPayment.id },
        data: { status: "failed" },
      });

      let updatedBooking = booking;

      if (nextStatus && nextStatus !== booking.status) {
        updatedBooking = await tx.booking.update({
          where: { id: booking.id },
          data: { status: nextStatus },
        });
      }

      return {
        payment: updatedPayment,
        booking: updatedBooking,
        chapaStatus,
        outcome,
      };
    }

    // Chapa has verified that payment succeeded.
    if (booking.status === "cancelled" || booking.status === "expired") {
      const updatedPayment = await tx.payment.update({
        where: { id: currentPayment.id },
        data: { status: "success" },
      });

      // The Order model has refund tracking fields, but no status field.
      // Flag the order for manual refund review if it exists.
      await tx.order.updateMany({
        where: { bookingId: booking.id },
        data: {
          needsManualRefund: true,
          refundNote:
            `Chapa reported successful payment for a ${booking.status} booking. ` +
            "Review the transaction and refund manually if appropriate.",
        },
      });

      // Do not change the terminal booking status or issue a QR code.
      return {
        payment: updatedPayment,
        booking,
        chapaStatus,
        outcome,
        needsManualRefund: true,
      };
    }

    const nextStatus = bookingTransitionsFromPayment[booking.status]?.success;

    if (!nextStatus) {
      throw new Error(
        `No valid transition from booking status "${booking.status}" for payment outcome "success"`,
      );
    }

    const bookingData = { status: nextStatus };

    if (!booking.qrCode) {
      bookingData.qrCode = crypto.randomUUID();
    }

    const updatedBooking = await tx.booking.update({
      where: { id: booking.id },
      data: bookingData,
    });

    const updatedPayment = await tx.payment.update({
      where: { id: currentPayment.id },
      data: { status: "success" },
    });

    return {
      payment: updatedPayment,
      booking: updatedBooking,
      chapaStatus,
      outcome,
    };
  });
};

/**
 * Handle a Chapa webhook after validating its signature.
 * Always verify the transaction with Chapa before changing local state.
 */
const handleChapaWebhook = async (rawBody, signatureHeader) => {
  if (!isValidWebhookSignature(rawBody, signatureHeader)) {
    throw new Error("Invalid webhook signature");
  }

  let event;

  try {
    event = JSON.parse(rawBody.toString("utf8"));
  } catch {
    throw new Error("Invalid webhook JSON");
  }

  const txRef = event?.tx_ref || event?.trx_ref;

  if (typeof txRef !== "string" || !txRef.trim()) {
    throw new Error("Webhook payload missing tx_ref");
  }

  return processPaymentResult(txRef);
};

/**
 * Check payment status for the authenticated payment owner.
 * All verified payment results use processPaymentResult so that callbacks
 * and status checks share the same transition rules.
 */
const checkPaymentStatus = async (txRef, userId) => {
  if (typeof txRef !== "string" || !txRef.trim()) {
    throw new Error("Transaction reference is required");
  }

  userId = validateId(userId, "user ID");

  let payment = await prisma.payment.findUnique({
    where: { chapaTxRef: txRef },
    include: { booking: true },
  });

  if (!payment) {
    throw new Error("Payment not found");
  }

  if (payment.userId !== userId) {
    throw new Error("Access denied");
  }

  // Expire stale pending bookings using the shared B1 helper.
  if (payment.status === "pending" && payment.booking?.status === "pending") {
    const expiryCutoff = new Date(
      Date.now() - getOrderExpiryMinutes() * 60 * 1000,
    );

    if (payment.booking.createdAt < expiryCutoff) {
      await prisma.$transaction(async (tx) => {
        await expireStale(tx, { gymId: payment.booking.gymId });

        const freshBooking = await tx.booking.findUnique({
          where: { id: payment.bookingId },
        });

        // Only mark payment failed when the booking actually expired.
        if (freshBooking?.status === "expired") {
          await tx.payment.updateMany({
            where: {
              id: payment.id,
              status: "pending",
            },
            data: { status: "failed" },
          });
        }
      });
    }
  }

  // Re-read current local state after expiry processing.
  payment = await prisma.payment.findUnique({
    where: { chapaTxRef: txRef },
    include: { booking: true },
  });

  if (!payment) {
    throw new Error("Payment not found");
  }

  // Still verify with Chapa: a payment may have succeeded just before
  // expiry was processed. Late success is handled without reviving a
  // cancelled or expired booking.
  const result = await processPaymentResult(txRef);

  const freshBooking = await prisma.booking.findUnique({
    where: { id: payment.bookingId },
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

module.exports = {
  initializePayment,
  verifyChapaTransaction,
  checkPaymentStatus,
  processPaymentResult,
  handleChapaWebhook,
};
