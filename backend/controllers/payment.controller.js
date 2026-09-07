const paymentService = require("../services/payment.service");

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
    console.error("Initialize Payment Error:");

    console.error(error.response?.data || error.message || error);

    return res.status(400).json({
      success: false,
      message:
        error.response?.data?.message ||
        error.message ||
        "Failed to initialize payment",
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

    if (!frontendUrl) {
      throw new Error("FRONTEND_URL is not configured");
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

    return res.redirect(
      `${frontendUrl}/payment-pending?tx_ref=${encodeURIComponent(txRef)}`,
    );
  } catch (error) {
    console.error("Chapa callback error:");

    console.error(error.response?.data || error.message || error);

    return res.status(400).json({
      success: false,
      message:
        error.response?.data?.message ||
        error.message ||
        "Failed to process Chapa callback",
    });
  }
};

const chapaWebhookController = async (req, res) => {
  try {
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

    const result = await paymentService.handleChapaWebhook(rawBody, signature);

    return res.status(200).json({
      success: true,
      message: "Webhook processed successfully",
      result,
    });
  } catch (error) {
    console.error("Chapa webhook error:");

    console.error(error.response?.data || error.message || error);

    return res.status(400).json({
      success: false,
      message:
        error.response?.data?.message ||
        error.message ||
        "Webhook processing failed",
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
      message:
        error.response?.data?.message ||
        error.message ||
        "Failed to verify payment",
    });
  }
};

module.exports = {
  initializePaymentController,
  chapaCallbackController,
  chapaWebhookController,
  verifyPaymentController,
};
