const express = require("express");
const router = express.Router();

const {
  initializePaymentController,
  verifyPaymentController,
} = require("../controllers/payment.controller");

const { protect } = require("../middleware/auth.middleware");

router.post("/initialize", protect, initializePaymentController);
router.get("/verify/:txRef", protect, verifyPaymentController);

module.exports = router;
