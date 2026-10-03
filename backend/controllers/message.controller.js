const messageService = require("../services/message.service.js");

const createConversationController = async (req, res) => {
  try {
    const memberId = req.user.id;
    const { trainerId } = req.body;

    if (!trainerId) {
      return res.status(400).json({
        success: false,
        message: "Trainer ID is required",
      });
    }

    const conversation = await messageService.createConversation(
      memberId,
      trainerId,
    );

    return res.status(201).json({
      success: true,
      message: "Conversation created successfully",
      conversation,
    });
  } catch (error) {
    console.error("Create conversation error:", error);

    return res.status(400).json({
      success: false,
      message: error.message || "Failed to create conversation",
    });
  }
};

const getMemberConversationsController = async (req, res) => {
  try {
    const memberId = req.user.id;

    const conversations = await messageService.getMemberConversations(memberId);

    return res.status(200).json({
      success: true,
      conversations,
    });
  } catch (error) {
    console.error("Get member conversations error:", error);

    return res.status(400).json({
      success: false,
      message: error.message || "Failed to get conversations",
    });
  }
};

const sendMemberMessageController = async (req, res) => {
  try {
    const conversationId = req.params.conversationId;

    const senderId = req.user.id;

    const { content } = req.body;

    const message = await messageService.sendMessage({
      conversationId,
      senderId,
      senderType: "MEMBER",
      content,
    });

    return res.status(201).json({
      success: true,
      message: "Message sent successfully",
      data: message,
    });
  } catch (error) {
    console.error("Send member message error:", error);

    return res.status(400).json({
      success: false,
      message: error.message || "Failed to send message",
    });
  }
};

const getMemberConversationMessagesController = async (req, res) => {
  try {
    const conversationId = req.params.conversationId;

    const actorId = req.user.id;

    const messages = await messageService.getConversationMessages({
      conversationId,
      actorId,
      actorType: "MEMBER",
    });

    return res.status(200).json({
      success: true,
      messages,
    });
  } catch (error) {
    console.error("Get member messages error:", error);

    return res.status(400).json({
      success: false,
      message: error.message || "Failed to get messages",
    });
  }
};

const getTrainerConversationsController = async (req, res) => {
  try {
    const trainerId = req.user.trainerId;

    const conversations =
      await messageService.getTrainerConversations(trainerId);

    return res.status(200).json({
      success: true,
      conversations,
    });
  } catch (error) {
    console.error("Get trainer conversations error:", error);

    return res.status(400).json({
      success: false,
      message: error.message || "Failed to get trainer conversations",
    });
  }
};

const sendTrainerMessageController = async (req, res) => {
  try {
    const conversationId = req.params.conversationId;

    const senderId = req.user.trainerId;

    const { content } = req.body;

    const message = await messageService.sendMessage({
      conversationId,
      senderId,
      senderType: "TRAINER",
      content,
    });

    return res.status(201).json({
      success: true,
      message: "Message sent successfully",
      data: message,
    });
  } catch (error) {
    console.error("Send trainer message error:", error);

    return res.status(400).json({
      success: false,
      message: error.message || "Failed to send message",
    });
  }
};

const getTrainerConversationMessagesController = async (req, res) => {
  try {
    const conversationId = req.params.conversationId;

    const actorId = req.user.trainerId;

    const messages = await messageService.getConversationMessages({
      conversationId,
      actorId,
      actorType: "TRAINER",
    });

    return res.status(200).json({
      success: true,
      messages,
    });
  } catch (error) {
    console.error("Get trainer messages error:", error);

    return res.status(400).json({
      success: false,
      message: error.message || "Failed to get messages",
    });
  }
};

const markConversationMessagesAsReadController = async (req, res) => {
  try {
    const conversationId = Number(req.params.conversationId);

    if (!Number.isInteger(conversationId) || conversationId <= 0) {
      return res.status(400).json({
        success: false,
        message: "Invalid conversation ID",
      });
    }

    const result = await messageService.markConversationMessagesAsRead({
      conversationId,
      actorId: req.user.id,
      actorType: "MEMBER",
    });

    return res.status(200).json({
      success: true,
      message: "Messages marked as read",
      ...result,
    });
  } catch (error) {
    console.error("Mark member messages as read error:", error);

    if (error.message === "Conversation not found") {
      return res.status(404).json({
        success: false,
        message: error.message,
      });
    }

    if (error.message === "You are not allowed to access this conversation") {
      return res.status(403).json({
        success: false,
        message: error.message,
      });
    }

    return res.status(500).json({
      success: false,
      message: "Unable to mark messages as read",
    });
  }
};

const markTrainerConversationMessagesAsReadController = async (req, res) => {
  try {
    const conversationId = Number(req.params.conversationId);

    if (!Number.isInteger(conversationId) || conversationId <= 0) {
      return res.status(400).json({
        success: false,
        message: "Invalid conversation ID",
      });
    }

    const result = await messageService.markConversationMessagesAsRead({
      conversationId,
      actorId: req.user.trainerId,
      actorType: "TRAINER",
    });

    return res.status(200).json({
      success: true,
      message: "Messages marked as read",
      ...result,
    });
  } catch (error) {
    console.error("Mark trainer messages as read error:", error);

    if (error.message === "Conversation not found") {
      return res.status(404).json({
        success: false,
        message: error.message,
      });
    }

    if (error.message === "You are not allowed to access this conversation") {
      return res.status(403).json({
        success: false,
        message: error.message,
      });
    }

    return res.status(500).json({
      success: false,
      message: "Unable to mark messages as read",
    });
  }
};

module.exports = {
  createConversationController,
  getMemberConversationsController,
  sendMemberMessageController,
  getMemberConversationMessagesController,
  getTrainerConversationsController,
  sendTrainerMessageController,
  getTrainerConversationMessagesController,
  markConversationMessagesAsReadController,
  markTrainerConversationMessagesAsReadController,
};
