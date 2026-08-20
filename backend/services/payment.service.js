const axios = require("axios");
const crypto = require("crypto");
const prisma = require("../config/prisma");

const CHAPA_BASE_URL = "https://api.chapa.co/v1";
const CHAPA_SECRET_KEY = process.env.CHAPA_SECRET_KEY;
const CHAPA_WEBHOOK_SECRET = process.env.CHAPA_WEBHOOK_SECRET;
const CHAPA_CALLBACK_URL = process.env.CHAPA_CALLBACK_URL;
const CHAPA_RETURN_URL = process.env.CHAPA_RETURN_URL;

const bookingTransitionsFromPayment = {
  pending: ["confirmed", "cancelled"],
};

const initializePayment = async (bookingId, userId) => {
  const booking = await prisma.booking.findUnique({
    where: { id: bookingId },
    include: { package: true, user: true, payment: true },
  });

  if (!booking) {
    throw new Error("Booking not found");
  }

  if (booking.userId !== userId) {
    throw new Error("Access denied");
  }

  if (booking.status !== "pending") {
    throw new Error(`Cannot pay for a booking with status ${booking.status}`);
  }

  if (booking.payment && booking.payment.status === "success") {
    throw new Error("Booking is already paid for");
  }

  if (!booking.package) {
    throw new Error("Booking has no package to price the payment from");
  }

  const amount = booking.package.price;
  const txRef = `booking-${bookingId}-${Date.now()}`;

  const chapaResponse = await axios.post(
    `${CHAPA_BASE_URL}/transaction/initialize`,
    {
      amount,
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
      },
    },
  );

  const checkoutUrl = chapaResponse.data?.data?.checkout_url;

  if (!checkoutUrl) {
    throw new Error("Chapa did not return a checkout URL");
  }

  return await prisma.payment.upsert({
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
      chapaTxRef: txRef,
      chapaCheckoutUrl: checkoutUrl,
      status: "pending",
    },
  });
};

const verifyChapaTransaction = async (txRef) => {
  console.log("Sending to Chapa verify:", txRef);

  const response = await axios.get(
    `${CHAPA_BASE_URL}/transaction/verify/${txRef}`,
    {
      headers: {
        Authorization: `Bearer ${CHAPA_SECRET_KEY}`,
      },
    },
  );

  return response.data;
};

const isValidWebhookSignature = (rawBody, signatureHeader) => {
  if (!signatureHeader || !CHAPA_WEBHOOK_SECRET) {
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

const handleChapaWebhook = async (rawBody, signatureHeader) => {
  if (!isValidWebhookSignature(rawBody, signatureHeader)) {
    throw new Error("Invalid webhook signature");
  }

  const event = JSON.parse(rawBody.toString("utf8"));

  console.log("CHAPA WEBHOOK PAYLOAD:", JSON.stringify(event, null, 2));

  const txRef = event.tx_ref;

  console.log("WEBHOOK TX REF:", txRef);

  if (!txRef) {
    throw new Error("Webhook payload missing tx_ref");
  }

  const payment = await prisma.payment.findUnique({
    where: { chapaTxRef: txRef },
  });

  if (!payment) {
    throw new Error(`No payment found for tx_ref ${txRef}`);
  }

  if (payment.status === "success") {
    return payment;
  }

  const verification = await verifyChapaTransaction(txRef);

  console.log(
    "CHAPA VERIFICATION RESPONSE:",
    JSON.stringify(verification, null, 2),
  );

  const isSuccess =
    verification?.status === "success" &&
    verification?.data?.status === "success";

  console.log("PAYMENT SUCCESS:", isSuccess);

  if (!isSuccess) {
    // return await prisma.payment.update({
    //   where: { id: payment.id },
    //   data: { status: "failed" },
    // });

    const failedResult = await prisma.$transaction(async (tx) => {
      const updatedPayment = await prisma.payment.update({
        where: { id: payment.id },
        data: { status: "failed" },
      });

      const booking = await tx.booking.findUnique({
        where: { id: payment.bookingId },
      });

      const allowedNext = bookingTransitionsFromPayment[booking.status] || [];

      if (allowedNext.includes("cancelled")) {
        await tx.booking.update({
          where: { id: payment.bookingId },
          data: {
            status: "cancelled"
          },
        });
      }
      return updatedPayment;
    })

    return failedResult;
  }

  const result = await prisma.$transaction(async (tx) => {
    const updatedPayment = await tx.payment.update({
      where: { id: payment.id },
      data: { status: "success" },
    });

    const booking = await tx.booking.findUnique({
      where: { id: payment.bookingId },
    });

    const allowedNext = bookingTransitionsFromPayment[booking.status] || [];

    if (allowedNext.includes("confirmed")) {
      await tx.booking.update({
        where: { id: payment.bookingId },
        data: {
          status: "confirmed",
          qrCode: crypto.randomUUID(),
        },
      });
    }

    return updatedPayment;
  });

  return result;
};

const processSuccessfulPayment = async (txRef) => {
  console.log("=================================");
  console.log("PROCESSING PAYMENT:", txRef);
  console.log("=================================");

  const payment = await prisma.payment.findUnique({
    where: {
      chapaTxRef: txRef,
    },
  });

  if (!payment) {
    throw new Error(`Payment not found for tx_ref: ${txRef}`);
  }

  console.log("DATABASE PAYMENT:", payment);
  const verification = await verifyChapaTransaction(txRef);

  console.log("CHAPA VERIFICATION:", JSON.stringify(verification, null, 2));

  const chapaStatus = verification?.data?.status;

  console.log("CHAPA STATUS:", chapaStatus);

  if (chapaStatus !== "success") {
    throw new Error(`Payment is not successful. Chapa status: ${chapaStatus}`);
  }

  const result = await prisma.$transaction(async (tx) => {
    const updatedPayment = await tx.payment.update({
      where: {
        id: payment.id,
      },
      data: {
        status: "success",
      },
    });

    const booking = await tx.booking.findUnique({
      where: {
        id: payment.bookingId,
      },
    });

    if (!booking) {
      throw new Error("Booking not found");
    }

    console.log("BOOKING BEFORE UPDATE:", booking);

    if (booking.status === "pending") {
      const updatedBooking = await tx.booking.update({
        where: {
          id: payment.bookingId,
        },
        data: {
          status: "confirmed",
          qrCode: crypto.randomUUID(),
        },
      });

      console.log("BOOKING AFTER UPDATE:", updatedBooking);

      return {
        payment: updatedPayment,
        booking: updatedBooking,
      };
    }

    return {
      payment: updatedPayment,
      booking,
    };
  });

  return result;
};
module.exports = {
  initializePayment,
  verifyChapaTransaction,
  processSuccessfulPayment,
  handleChapaWebhook,
};
