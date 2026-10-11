const express = require("express");
const router = express.Router();

const { protect } = require("../middleware/auth.middleware");
const { getSessionsController } = require("../controllers/session.controller");

router.get("/", protect, getSessionsController);

module.exports = router;
