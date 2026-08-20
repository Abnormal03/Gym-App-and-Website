const paymentService = require("../services/payment.service");

const initializePaymentController = async (req, res) => {
  try {
    console.log("========================================");
    console.log("========== INITIALIZE PAYMENT ==========");
    console.log("========================================");

    console.log("REQ BODY:", req.body);
    console.log("REQ USER:", req.user);

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
    console.log("========================================");
    console.log("========== CHAPA CALLBACK ===============");
    console.log("========================================");

    console.log("QUERY:", req.query);
    const txRef = req.query.trx_ref || req.query.tx_ref;

    if (!txRef) {
      console.error("Callback transaction reference missing");

      return res.status(400).json({
        success: false,
        message: "Transaction reference is missing",
      });
    }

    console.log("CALLBACK TX REF:", txRef);
    const result = await paymentService.processPaymentResult(txRef);

    console.log("CALLBACK PAYMENT RESULT:", result);

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
    console.log("========================================");
    console.log("========== CHAPA WEBHOOK ===============");
    console.log("========================================");

    console.log("HEADERS:", {
      "x-chapa-signature": req.headers["x-chapa-signature"],

      "chapa-signature": req.headers["chapa-signature"],
    });

    const rawBody = req.rawBody;

    if (!rawBody) {
      console.error("Webhook raw body is missing");

      return res.status(400).json({
        success: false,
        message: "Webhook raw body is missing",
      });
    }

    console.log("RAW BODY:", rawBody.toString("utf8"));

    const signature =
      req.headers["x-chapa-signature"] || req.headers["chapa-signature"];

    if (!signature) {
      console.error("Webhook signature is missing");

      return res.status(401).json({
        success: false,
        message: "Webhook signature is missing",
      });
    }

    console.log("WEBHOOK SIGNATURE:", signature);

    const result = await paymentService.handleChapaWebhook(rawBody, signature);

    console.log("WEBHOOK RESULT:", result);

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

    console.log("========== MANUAL PAYMENT VERIFY ==========");

    console.log("TX REF:", txRef);
    console.log("USER ID:", req.user.id);

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
