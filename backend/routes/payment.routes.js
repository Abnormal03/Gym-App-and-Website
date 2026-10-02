const express = require("express");

const {
  initializePaymentController,
  initializeTrainerSessionPaymentController,
  chapaCallbackController,
  chapaWebhookController,
  verifyPaymentController,
} = require("../controllers/payment.controller");

const { protect } = require("../middleware/auth.middleware");

const router = express.Router();

router.post("/initialize", protect, initializePaymentController);

router.post(
  "/trainer-session",
  protect,
  initializeTrainerSessionPaymentController,
);

router.get("/callback", chapaCallbackController);

router.post("/webhook", chapaWebhookController);

router.get("/verify/:txRef", protect, verifyPaymentController);

module.exports = router;
