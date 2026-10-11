const express = require("express");
const { protect } = require("../middleware/auth.middleware");
const {
  createCheckoutController,
  quoteCheckoutController,
} = require("../controllers/checkout.controller");

const router = express.Router();

router.post("/", protect, createCheckoutController);
router.post("/quote", protect, quoteCheckoutController);

module.exports = router;
