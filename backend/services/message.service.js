const prisma = require("../config/prisma.js");

const createConversation = async (memberId, trainerId) => {
  memberId = Number(memberId);
  trainerId = Number(trainerId);

  if (!Number.isInteger(memberId) || memberId <= 0) {
    throw new Error("Invalid member ID");
  }

  if (!Number.isInteger(trainerId) || trainerId <= 0) {
    throw new Error("Invalid trainer ID");
  }

  // Check member
  const member = await prisma.user.findUnique({
    where: {
      id: memberId,
    },
  });

  if (!member) {
    throw new Error("Member not found");
  }

  // Check trainer
  const trainer = await prisma.trainer.findUnique({
    where: {
      id: trainerId,
    },
  });

  if (!trainer) {
    throw new Error("Trainer not found");
  }

  // Check existing conversation
  const existingConversation = await prisma.conversation.findUnique({
    where: {
      memberId_trainerId: {
        memberId,
        trainerId,
      },
    },
    include: {
      member: {
        select: {
          id: true,
          name: true,
          email: true,
          photoUrl: true,
        },
      },
      trainer: {
        select: {
          id: true,
          name: true,
          specialization: true,
          profilePhotoUrl: true,
          rating: true,
        },
      },
    },
  });

  if (existingConversation) {
    return existingConversation;
  }

  return prisma.conversation.create({
    data: {
      memberId,
      trainerId,
    },
    include: {
      member: {
        select: {
          id: true,
          name: true,
          email: true,
          photoUrl: true,
        },
      },
      trainer: {
        select: {
          id: true,
          name: true,
          specialization: true,
          profilePhotoUrl: true,
          rating: true,
        },
      },
    },
  });
};

const sendMessage = async ({
  conversationId,
  senderId,
  senderType,
  content,
}) => {
  conversationId = Number(conversationId);
  senderId = Number(senderId);

  if (!Number.isInteger(conversationId) || conversationId <= 0) {
    throw new Error("Invalid conversation ID");
  }

  if (!Number.isInteger(senderId) || senderId <= 0) {
    throw new Error("Invalid sender ID");
  }

  if (!["MEMBER", "TRAINER"].includes(senderType)) {
    throw new Error("Invalid sender type");
  }

  if (!content || typeof content !== "string") {
    throw new Error("Message content is required");
  }

  const trimmedContent = content.trim();

  if (!trimmedContent) {
    throw new Error("Message content cannot be empty");
  }

  if (trimmedContent.length > 2000) {
    throw new Error("Message cannot exceed 2000 characters");
  }

  // Find conversation
  const conversation = await prisma.conversation.findUnique({
    where: {
      id: conversationId,
    },
  });

  if (!conversation) {
    throw new Error("Conversation not found");
  }

  if (senderType === "MEMBER") {
    if (conversation.memberId !== senderId) {
      throw new Error("You are not a member of this conversation");
    }
  }

  if (senderType === "TRAINER") {
    if (conversation.trainerId !== senderId) {
      throw new Error("You are not the trainer in this conversation");
    }
  }

  return prisma.message.create({
    data: {
      conversationId,
      senderType,
      senderId,
      content: trimmedContent,
    },
  });
};

const getMemberConversations = async (memberId) => {
  memberId = Number(memberId);

  if (!Number.isInteger(memberId) || memberId <= 0) {
    throw new Error("Invalid member ID");
  }

  return prisma.conversation.findMany({
    where: {
      memberId,
    },
    orderBy: {
      updatedAt: "desc",
    },
    include: {
      trainer: {
        select: {
          id: true,
          name: true,
          specialization: true,
          profilePhotoUrl: true,
          rating: true,
        },
      },
      messages: {
        orderBy: {
          createdAt: "desc",
        },
        take: 1,
        select: {
          id: true,
          senderType: true,
          senderId: true,
          content: true,
          isRead: true,
          createdAt: true,
        },
      },
    },
  });
};

const getTrainerConversations = async (trainerId) => {
  trainerId = Number(trainerId);

  if (!Number.isInteger(trainerId) || trainerId <= 0) {
    throw new Error("Invalid trainer ID");
  }

  return prisma.conversation.findMany({
    where: {
      trainerId,
    },
    orderBy: {
      updatedAt: "desc",
    },
    include: {
      member: {
        select: {
          id: true,
          name: true,
          email: true,
          photoUrl: true,
        },
      },
      messages: {
        orderBy: {
          createdAt: "desc",
        },
        take: 1,
        select: {
          id: true,
          senderType: true,
          senderId: true,
          content: true,
          isRead: true,
          createdAt: true,
        },
      },
    },
  });
};

const getConversationMessages = async ({
  conversationId,
  actorId,
  actorType,
}) => {
  conversationId = Number(conversationId);
  actorId = Number(actorId);

  if (!Number.isInteger(conversationId) || conversationId <= 0) {
    throw new Error("Invalid conversation ID");
  }

  if (!Number.isInteger(actorId) || actorId <= 0) {
    throw new Error("Invalid actor ID");
  }

  if (!["MEMBER", "TRAINER"].includes(actorType)) {
    throw new Error("Invalid actor type");
  }

  const conversation = await prisma.conversation.findUnique({
    where: {
      id: conversationId,
    },
  });

  if (!conversation) {
    throw new Error("Conversation not found");
  }

  if (actorType === "MEMBER" && conversation.memberId !== actorId) {
    throw new Error("You are not a member of this conversation");
  }

  if (actorType === "TRAINER" && conversation.trainerId !== actorId) {
    throw new Error("You are not the trainer in this conversation");
  }

  return prisma.message.findMany({
    where: {
      conversationId,
    },
    orderBy: {
      createdAt: "asc",
    },
  });
};

const markConversationMessagesAsRead = async ({
  conversationId,
  actorId,
  actorType,
}) => {
  const conversation = await prisma.conversation.findUnique({
    where: { id: conversationId },
  });

  if (!conversation) {
    throw new Error("Conversation not found");
  }

  // Verify the actor belongs to this conversation
  if (actorType === "MEMBER") {
    if (conversation.memberId !== actorId) {
      throw new Error("You are not allowed to access this conversation");
    }
  }

  if (actorType === "TRAINER") {
    if (conversation.trainerId !== actorId) {
      throw new Error("You are not allowed to access this conversation");
    }
  }

  // Mark only the OTHER participant's messages as read
  const senderTypeToMark = actorType === "MEMBER" ? "TRAINER" : "MEMBER";

  const result = await prisma.message.updateMany({
    where: {
      conversationId,
      senderType: senderTypeToMark,
      isRead: false,
    },
    data: {
      isRead: true,
    },
  });

  return {
    updatedCount: result.count,
  };
};

module.exports = {
  createConversation,
  sendMessage,
  getMemberConversations,
  getTrainerConversations,
  getConversationMessages,
  markConversationMessagesAsRead,
};
