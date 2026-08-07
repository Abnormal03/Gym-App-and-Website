const paymentService = require("../services/payment.service");

const initializePaymentController = async (req, res) => {
  try {
    const payment = await paymentService.initializePayment(
      Number(req.body.bookingId),
      req.user.id,
    );

    res.status(201).json({
      success: true,
      checkoutUrl: payment.chapaCheckoutUrl,
      txRef: payment.chapaTxRef,
    });
  } catch (error) {
    console.log("Initialize Payment Error:");
    console.log(error.response?.data || error.message);

    res.status(400).json({
      success: false,
      error: error.response?.data || error.message,
    });
  }
};

const chapaWebhookController = async (req, res) => {
  try {
    await paymentService.handleChapaWebhook(
      req.body,
      req.headers["x-chapa-signature"] || req.headers["chapa-signature"],
    );
  } catch (error) {
    console.error("Chapa webhook error:", error.message);
  }

  res.sendStatus(200);
};
const verifyPaymentController = async (req, res) => {
  try {
    const result = await paymentService.verifyChapaTransaction(
      req.params.txRef,
    );

    res.json({
      success: true,
      result,
    });
  } catch (error) {
    console.log(error.response?.data);

    res.status(500).json({
      success: false,
      message: error.response?.data || error.message,
    });
  }
};

module.exports = {
  initializePaymentController,
  chapaWebhookController,
  verifyPaymentController,
};
