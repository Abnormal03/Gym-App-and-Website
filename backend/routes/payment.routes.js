const express = require("express");

const {
  initializePaymentController,
  initializeTrainerSessionPaymentController,
  chapaCallbackController,
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

router.get("/verify/:txRef", protect, verifyPaymentController);

module.exports = router;
