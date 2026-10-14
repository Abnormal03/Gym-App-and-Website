const paymentService = require("../services/payment.service");

const { isInternalDbError } = require("../utils/safeError");

const getPaymentErrorMessage = (error, fallbackMessage) => {
  if (isInternalDbError(error)) return fallbackMessage;

  const responseData = error.response?.data;
  const message = responseData?.message ?? responseData?.error;

  if (typeof message === "string" && message.trim()) {
    return message;
  }

  if (message && typeof message === "object") {
    try {
      return JSON.stringify(message);
    } catch {
      return error.message || fallbackMessage;
    }
  }

  return error.message || fallbackMessage;
};

const getHttpStatus = (error) => {
  if (
    [
      "Invalid booking ID",
      "Valid bookingId is required",
      "Transaction reference is required",
      "Transaction reference is missing",
      "Invalid transaction reference",
    ].includes(error.message)
  ) {
    return 400;
  }

  if (
    [
      "Booking not found",
      "Payment not found",
      "Transaction not found",
    ].includes(error.message)
  ) {
    return 404;
  }

  if (
    ["Access denied", "You are not authorized to access this payment"].includes(
      error.message,
    )
  ) {
    return 403;
  }

  if (
    [
      "Booking is not eligible for payment",
      "Booking has expired",
      "Booking is cancelled",
    ].includes(error.message)
  ) {
    return 409;
  }

  return 500;
};

const initializePaymentController = async (req, res) => {
  try {
    const bookingId = Number(req.body?.bookingId);

    if (
      req.body?.bookingId === undefined ||
      req.body?.bookingId === null ||
      req.body?.bookingId === "" ||
      !Number.isSafeInteger(bookingId) ||
      bookingId <= 0
    ) {
      return res.status(400).json({
        success: false,
        message: "Valid bookingId is required",
      });
    }

    const payment = await paymentService.initializePayment(
      bookingId,
      req.user.id,
    );

    return res.status(201).json({
      success: true,
      message: "Payment initialized successfully",
      checkoutUrl: payment.chapaCheckoutUrl,
      txRef: payment.chapaTxRef,
      payment,
    });
  } catch (error) {
    console.error(
      "Initialize payment error:",
      error.response?.data || error.message || error,
    );

    return res.status(getHttpStatus(error)).json({
      success: false,
      message: getPaymentErrorMessage(error, "Failed to initialize payment"),
    });
  }
};

const chapaCallbackController = async (req, res) => {
  try {
    const txRef = req.query.trx_ref || req.query.tx_ref;

    if (typeof txRef !== "string" || !txRef.trim()) {
      return res.status(400).json({
        success: false,
        message: "Transaction reference is missing",
      });
    }

    // Always verify the transaction with the service/provider.
    // Do not trust a status supplied in the callback query string.
    const result = await paymentService.processPaymentResult(txRef);

    const frontendUrl = process.env.FRONTEND_URL;

    const mobileReturnUrl = process.env.MOBILE_RETURN_URL;

    let destination;

    if (mobileReturnUrl) {
      destination = new URL(mobileReturnUrl);
      destination.searchParams.set("tx_ref", txRef);
      destination.searchParams.set(
        "status",
        result.needsManualRefund ? "review" : result.outcome || "pending",
      );
    } else {
      if (!frontendUrl) {
        throw new Error("FRONTEND_URL or MOBILE_RETURN_URL is not configured");
      }

      destination = new URL(frontendUrl);

      if (result.needsManualRefund) {
        destination.pathname = "/payment-pending";
        destination.searchParams.set("status", "review");
      } else if (result.outcome === "success") {
        destination.pathname = "/payment-success";
      } else if (result.outcome === "failed") {
        destination.pathname = "/payment-failed";
      } else {
        destination.pathname = "/payment-pending";
      }

      destination.searchParams.set("tx_ref", txRef);
    }

    return res.redirect(destination.toString());
  } catch (error) {
    console.error(
      "Chapa callback error:",
      error.response?.data || error.message || error,
    );

    // A browser-facing callback should not expose internal service errors.
    const frontendUrl = process.env.FRONTEND_URL;

    if (frontendUrl) {
      const destination = new URL("/payment-pending", frontendUrl);
      destination.searchParams.set("status", "verification_error");

      if (typeof req.query.trx_ref === "string") {
        destination.searchParams.set("tx_ref", req.query.trx_ref);
      } else if (typeof req.query.tx_ref === "string") {
        destination.searchParams.set("tx_ref", req.query.tx_ref);
      }

      return res.redirect(destination.toString());
    }

    return res.status(500).json({
      success: false,
      message: getPaymentErrorMessage(
        error,
        "Failed to process Chapa callback",
      ),
    });
  }
};

const chapaWebhookController = async (req, res) => {
  try {
    console.log("========================================");
    console.log(">>> CHAPA WEBHOOK RECEIVED");
    console.log("Time:", new Date().toISOString());
    console.log("========================================");

    const rawBody = req.rawBody;

    if (
      !rawBody ||
      !(Buffer.isBuffer(rawBody) || typeof rawBody === "string")
    ) {
      console.error("Webhook raw body is missing or invalid");

      return res.status(400).json({
        success: false,
        message: "Webhook raw body is missing or invalid",
      });
    }

    const signature =
      req.headers["x-chapa-signature"] || req.headers["chapa-signature"];

    if (typeof signature !== "string" || !signature.trim()) {
      return res.status(401).json({
        success: false,
        message: "Webhook signature is missing",
      });
    }

    const payload = typeof rawBody === "string" ? JSON.parse(rawBody) : rawBody;

    const result = await paymentService.handleChapaWebhook(
      payload,
      rawBody,
      signature,
    );

    return res.status(200).json({
      success: true,
      message: "Webhook processed successfully",
      result,
    });
  } catch (error) {
    console.error(
      "Chapa webhook error:",
      error.response?.data || error.message || error,
    );

    // A rejected or failed webhook must not be acknowledged as successful.
    const status = error.message?.toLowerCase().includes("signature")
      ? 401
      : 500;

    return res.status(status).json({
      success: false,
      message:
        status === 401
          ? "Webhook signature verification failed"
          : "Webhook processing failed",
    });
  }
};

const verifyPaymentController = async (req, res) => {
  console.log("VERIFY ROUTE REACHED:", req.params.txRef);

  try {
    const { txRef } = req.params;

    if (typeof txRef !== "string" || !txRef.trim()) {
      return res.status(400).json({
        success: false,
        message: "Transaction reference is required",
      });
    }

    console.log("BEFORE checkPaymentStatus");

    const result = await paymentService.checkPaymentStatus(txRef, req.user.id);

    console.log("AFTER checkPaymentStatus");

    return res.status(200).json({
      success: true,
      result,
    });
  } catch (error) {
    console.error("Payment status check error:", {
      message: error.message,
      stack: error.stack,
      response: error.response?.data,
    });

    return res.status(getHttpStatus(error)).json({
      success: false,
      message: getPaymentErrorMessage(error, "Failed to verify payment"),
    });
  }
};

const initializeTrainerSessionPaymentController = async (req, res) => {
  try {
    const trainerSessionId = Number(req.body.trainerSessionId);

    if (!trainerSessionId || Number.isNaN(trainerSessionId)) {
      return res.status(400).json({
        success: false,
        message: "Valid trainerSessionId is required",
      });
    }

    const payment = await paymentService.initializeTrainerSessionPayment(
      trainerSessionId,
      req.user.id,
    );

    return res.status(201).json({
      success: true,
      message: "Trainer session payment initialized successfully",
      checkoutUrl: payment.chapaCheckoutUrl,
      txRef: payment.chapaTxRef,
      payment,
    });
  } catch (error) {
    console.error(
      "Initialize Trainer Session Payment Error:",
      error.response?.data || error.message || error,
    );

    return res.status(400).json({
      success: false,
      message: getPaymentErrorMessage(
        error,
        "Failed to initialize trainer session payment",
      ),
    });
  }
};

module.exports = {
  initializePaymentController,
  initializeTrainerSessionPaymentController,
  chapaCallbackController,
  chapaWebhookController,
  verifyPaymentController,
};
