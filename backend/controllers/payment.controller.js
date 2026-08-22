const paymentService = require("../services/payment.service");

const initializePaymentController = async (req, res) => {
  try {
    console.log("========== INITIALIZE PAYMENT ==========");
    console.log("REQ BODY:", req.body);
    console.log("REQ USER:", req.user);

    const bookingId = Number(req.body.bookingId);

    if (!bookingId) {
      return res.status(400).json({
        success: false,
        error: "bookingId is required",
      });
    }

    console.log("BOOKING ID:", bookingId);

    const payment = await paymentService.initializePayment(
      bookingId,
      req.user.id,
    );

    console.log("PAYMENT CREATED:", payment);

    return res.status(201).json({
      success: true,
      checkoutUrl: payment.chapaCheckoutUrl,
      txRef: payment.chapaTxRef,
    });
  } catch (error) {
    console.error("Initialize Payment Error:");
    console.error(error.response?.data || error.message);

    return res.status(400).json({
      success: false,
      error: error.response?.data || error.message,
    });
  }
};

const chapaCallbackController = async (req, res) => {
  try {
    console.log("========== CHAPA CALLBACK ==========");
    console.log("QUERY:", req.query);

    const txRef = req.query.trx_ref || req.query.tx_ref;

    if (!txRef) {
      return res.status(400).json({
        success: false,
        message: "Transaction reference is missing",
      });
    }

    console.log("CALLBACK TX REF:", txRef);

    const result = await paymentService.processSuccessfulPayment(txRef);
    console.log("CALLBACK PAYMENT RESULT:", result);
    return res.redirect(
      `http://localhost:5173/payment-success?tx_ref=${encodeURIComponent(
        txRef,
      )}`,
    );
  } catch (error) {
    console.error("Chapa callback error:");
    console.error(error.response?.data || error.message);

    return res.status(400).json({
      success: false,
      message: error.response?.data || error.message,
    });
  }
};

const chapaWebhookController = async (req, res) => {
  try {
    const rawBody = req.rawBody;

    console.log("========== CHAPA WEBHOOK ==========");

    if (!rawBody) {
      console.error("Webhook raw body is missing");

      return res.status(400).json({
        success: false,
        message: "Webhook raw body is missing",
      });
    }

    const signature =
      req.headers["x-chapa-signature"] || req.headers["chapa-signature"];

    console.log("SIGNATURE:", signature);

    const result = await paymentService.handleChapaWebhook(rawBody, signature);

    console.log("WEBHOOK RESULT:", result);

    return res.status(200).json({
      success: true,
      message: "Webhook processed successfully",
    });
  } catch (error) {
    console.error("Chapa webhook error:", error.message);
    return res.status(500).json({
      success: false,
      message: "Unable to process payment."
    });
  }

  res.sendStatus(200);
};
const verifyPaymentController = async (req, res) => {
  try {
    const result = await paymentService.processSuccessfulPayment(
      req.params.txRef,
    );

    return res.json({
      success: true,
      result,
    });
  } catch (error) {
    console.error(
      "Manual verification error:",
      error.response?.data || error.message,
    );

    return res.status(500).json({
      success: false,
      message: error.response?.data || error.message,
    });
  }
};

module.exports = {
  initializePaymentController,
  chapaCallbackController,
  chapaWebhookController,
  verifyPaymentController,
};
