const {
  quoteCheckout,
  createCheckout,
} = require("../services/checkout.service");
const { clientMessage } = require("../utils/safeError");

const quoteCheckoutController = async (req, res) => {
  try {
    const data = await quoteCheckout({
      ...req.body,
      userId: req.user.id,
    });

    return res.status(200).json({ success: true, data });
  } catch (error) {
    console.error("Quote checkout error:", error);

    const clientErrorCodes = new Set([
      "PACKAGE_RESTRICTED",
      "CAPACITY_EXCEEDED",
      "PROVIDER_UNAVAILABLE",
      "SESSION_OUTSIDE_BOOKING",
      "NO_CONSULTANT_AVAILABLE",
      "OUTSIDE_GYM_OPENING_HOURS",
    ]);

    return res.status(400).json({
      success: false,
      message: clientErrorCodes.has(error.message)
        ? error.message
        : clientMessage(error, "Failed to calculate the price"),
    });
  }
};

const createCheckoutController = async (req, res) => {
  try {
    const data = await createCheckout({
      ...req.body,
      userId: req.user.id,
    });

    return res.status(201).json({ success: true, data });
  } catch (error) {
    console.error("Create checkout error:", error);

    return res.status(400).json({
      success: false,
      message: clientMessage(
        error,
        "Payment could not be initialized. Please retry.",
      ),
    });
  }
};

module.exports = {
  quoteCheckoutController,
  createCheckoutController,
};
