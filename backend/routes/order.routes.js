const express = require("express");
const { protect } = require("../middleware/auth.middleware");
const { getOrderStatusController } = require("../controllers/order.controller");

const router = express.Router();

router.get("/:id", protect, getOrderStatusController);

module.exports = router;
