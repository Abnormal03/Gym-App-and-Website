const express = require("express");

const {
  initializePaymentController,
  chapaCallbackController,
  verifyPaymentController,
} = require("../controllers/payment.controller");

const { protect } = require("../middleware/auth.middleware");

const router = express.Router();

router.post("/initialize", protect, initializePaymentController);
router.get("/callback", chapaCallbackController);
router.get("/verify/:txRef", protect, verifyPaymentController);

module.exports = router;
