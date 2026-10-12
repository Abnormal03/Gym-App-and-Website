const express = require("express");
const { requireRole } = require("../middleware/auth.middleware");
const { postChatbotMessage } = require("../controllers/chatbot.controller");

const router = express.Router();

router.post("/messages", ...requireRole("MEMBER"), postChatbotMessage);

module.exports = router;
