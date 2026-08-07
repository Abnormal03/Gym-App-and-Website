const express = require("express");
const router = express.Router();

const {
  initializePaymentController,
  chapaWebhookController,
  verifyPaymentController,
} = require("../controllers/payment.controller");

const { protect } = require("../middleware/auth.middleware");

router.post("/initialize", protect, initializePaymentController);
router.get("/verify/:txRef", protect, verifyPaymentController);

// CHAPA webhook
router.post(
  "/webhook",
  express.raw({ type: "application/json" }),
  chapaWebhookController,
);

module.exports = router;
