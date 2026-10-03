const paymentService = require("../services/payment.service");

const getPaymentErrorMessage = (error, fallbackMessage) => {
  const responseData = error.response?.data;
  const message = responseData?.message ?? responseData?.error ?? responseData;

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

const initializePaymentController = async (req, res) => {
  try {
    const bookingId = Number(req.body.bookingId);

    if (!bookingId || Number.isNaN(bookingId)) {
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
      "Initialize Payment Error:",
      error.response?.data || error.message || error,
    );

    return res.status(400).json({
      success: false,
      message: getPaymentErrorMessage(error, "Failed to initialize payment"),
    });
  }
};

const chapaCallbackController = async (req, res) => {
  try {
    const txRef = req.query.trx_ref || req.query.tx_ref;

    if (!txRef) {
      return res.status(400).json({
        success: false,
        message: "Transaction reference is missing",
      });
    }

    const result = await paymentService.processPaymentResult(txRef);

    const frontendUrl = process.env.FRONTEND_URL;

    const mobileReturnUrl = process.env.MOBILE_RETURN_URL;

    if (mobileReturnUrl) {
      const redirectUrl = new URL(mobileReturnUrl);

      redirectUrl.searchParams.set("tx_ref", txRef);

      redirectUrl.searchParams.set("status", result.outcome);

      if (result.refundStatus) {
        redirectUrl.searchParams.set("refund_status", result.refundStatus);
      }

      return res.redirect(redirectUrl.toString());
    }

    if (!frontendUrl) {
      throw new Error("FRONTEND_URL or MOBILE_RETURN_URL is not configured");
    }

    if (result.outcome === "success") {
      return res.redirect(
        `${frontendUrl}/payment-success?tx_ref=${encodeURIComponent(txRef)}`,
      );
    }

    if (result.outcome === "failed") {
      return res.redirect(
        `${frontendUrl}/payment-failed?tx_ref=${encodeURIComponent(txRef)}`,
      );
    }

    if (result.outcome === "refund_pending" || result.outcome === "refunded") {
      const redirectUrl = new URL(`${frontendUrl}/payment-refund`);

      redirectUrl.searchParams.set("tx_ref", txRef);

      redirectUrl.searchParams.set("status", result.outcome);

      if (result.refundStatus) {
        redirectUrl.searchParams.set("refund_status", result.refundStatus);
      }

      if (result.refundRef) {
        redirectUrl.searchParams.set("refund_ref", result.refundRef);
      }

      return res.redirect(redirectUrl.toString());
    }

    return res.redirect(
      `${frontendUrl}/payment-pending?tx_ref=${encodeURIComponent(txRef)}`,
    );
  } catch (error) {
    console.error(
      "Chapa callback error:",
      error.response?.data || error.message || error,
    );

    return res.status(400).json({
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

    if (!rawBody) {
      console.error("Webhook raw body is missing");

      return res.status(400).json({
        success: false,
        message: "Webhook raw body is missing",
      });
    }

    const signature =
      req.headers["x-chapa-signature"] || req.headers["chapa-signature"];

    if (!signature) {
      console.error("Webhook signature is missing");

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

    return res.status(400).json({
      success: false,
      message: getPaymentErrorMessage(error, "Webhook processing failed"),
    });
  }
};

const verifyPaymentController = async (req, res) => {
  try {
    const txRef = req.params.txRef;

    if (!txRef) {
      return res.status(400).json({
        success: false,
        message: "Transaction reference is required",
      });
    }

    const result = await paymentService.checkPaymentStatus(txRef, req.user.id);

    return res.status(200).json({
      success: true,
      result,
    });
  } catch (error) {
    console.error(
      "Payment status check error:",
      error.response?.data || error.message || error,
    );

    return res.status(400).json({
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
