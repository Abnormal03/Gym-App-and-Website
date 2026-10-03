const express = require("express");

const {
  createConversationController,
  getMemberConversationsController,
  sendMemberMessageController,
  getMemberConversationMessagesController,
  getTrainerConversationsController,
  sendTrainerMessageController,
  getTrainerConversationMessagesController,
  markConversationMessagesAsReadController,
  markTrainerConversationMessagesAsReadController,
} = require("../controllers/message.controller.js");

const { protect } = require("../middleware/auth.middleware.js");
const { trainerAuth } = require("../middleware/trainer.middleware.js");

const router = express.Router();

// Create conversation
router.post("/conversations", protect, createConversationController);

// Get member conversations
router.get("/conversations", protect, getMemberConversationsController);

// Send member message
router.post(
  "/conversations/:conversationId/messages",
  protect,
  sendMemberMessageController,
);

// Get member messages
router.get(
  "/conversations/:conversationId/messages",
  protect,
  getMemberConversationMessagesController,
);

// Get trainer conversations
router.get(
  "/trainer/conversations",
  trainerAuth,
  getTrainerConversationsController,
);

// Send trainer message
router.post(
  "/trainer/conversations/:conversationId/messages",
  trainerAuth,
  sendTrainerMessageController,
);

// Get trainer messages
router.get(
  "/trainer/conversations/:conversationId/messages",
  trainerAuth,
  getTrainerConversationMessagesController,
);

router.patch(
  "/conversations/:conversationId/read",
  protect,
  markConversationMessagesAsReadController,
);

router.patch(
  "/trainer/conversations/:conversationId/read",
  trainerAuth,
  markTrainerConversationMessagesAsReadController,
);

module.exports = router;
