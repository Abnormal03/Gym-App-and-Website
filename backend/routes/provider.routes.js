const express = require("express");
const router = express.Router();

const { searchProviders } = require("../controllers/provider.controller");
const { protect } = require("../middleware/auth.middleware");

router.get("/search", protect, searchProviders);

module.exports = router;
