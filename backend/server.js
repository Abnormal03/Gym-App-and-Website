require("dotenv").config();

const express = require("express");
const http = require("http");
const cors = require("cors");
const jwt = require("jsonwebtoken");
const { Server } = require("socket.io");

const { socketAuth } = require("./middleware/socket.middleware.js");
const prisma = require("./config/prisma.js");

const authRoutes = require("./routes/auth.routes.js");
const userRoutes = require("./routes/user.routes.js");
const adminRoutes = require("./routes/admin.routes.js");
const gymRoutes = require("./routes/gym.routes.js");
const packageRoutes = require("./routes/packages.routes.js");
const bookingRoutes = require("./routes/booking.routes.js");
const orderRoutes = require("./routes/order.routes");
const paymentRoutes = require("./routes/payment.routes.js");
const providerPortalRoutes = require("./routes/providerPortal.routes");
const {
  chapaWebhookController,
} = require("./controllers/payment.controller.js");
const { errorHandler } = require("./utils/responses");
const checkoutRoutes = require("./routes/checkout.routes");
const sessionRoutes = require("./routes/session.routes");
const leaderboardRoutes = require("./routes/leaderboard.routes.js");
const chatbotRoutes = require("./routes/chatbot.routes.js");
const providerRoutes = require("./routes/provider.routes.js");
const checkInRoutes = require("./routes/checkIn.routes.js");
const payoutRoutes = require("./routes/payout.routes.js");
const chatRoutes = require("./routes/chat.routes.js");
const trainerRoutes = require("./routes/trainer.routes.js");
const messageRoutes = require("./routes/message.routes.js");

const { ensureThreadMembership } = require("./services/chatThread.service");
const {
  expirePendingTrainerSessions,
} = require("./services/trainer.service.js");
const { sendMessage } = require("./services/message.service.js");
const { expireStale } = require("./services/bookingHelpers.service.js");

const app = express();

// Create ONE HTTP server.
const httpServer = http.createServer(app);

// Create ONE Socket.IO server.
const io = new Server(httpServer, {
  cors: {
    origin: process.env.CLIENT_URL || "*",
    methods: ["GET", "POST"],
    credentials: Boolean(process.env.CLIENT_URL),
  },
});

// Authenticate the existing conversation/message socket events.
io.use(socketAuth);

// The separate namespace is used for V2 chat threads.
const chatIo = io.of("/chat");
app.locals.io = chatIo;

// =====================================================
// EXISTING CONVERSATION SOCKET EVENTS
// =====================================================

io.on("connection", (socket) => {
  console.log(
    `Socket connected: ${socket.id} - ${socket.user.type} ${socket.user.id}`,
  );

  socket.on("join_conversation", async (conversationId) => {
    try {
      const id = Number(conversationId);

      if (!Number.isInteger(id) || id <= 0) {
        socket.emit("conversation_error", {
          message: "Invalid conversation ID",
        });
        return;
      }

      const conversation = await prisma.conversation.findUnique({
        where: { id },
      });

      if (!conversation) {
        socket.emit("conversation_error", {
          message: "Conversation not found",
        });
        return;
      }

      let authorized = false;

      if (socket.user.type === "MEMBER") {
        authorized = conversation.memberId === socket.user.id;
      }

      if (socket.user.type === "TRAINER") {
        authorized = conversation.trainerId === socket.user.id;
      }

      if (!authorized) {
        socket.emit("conversation_error", {
          message: "You are not allowed to access this conversation",
        });
        return;
      }

      const room = `conversation:${id}`;

      socket.join(room);

      console.log(
        `${socket.user.type} ${socket.user.id} joined conversation ${id}`,
      );

      socket.emit("conversation_joined", {
        conversationId: id,
      });
    } catch (error) {
      console.error("Join conversation error:", error);

      socket.emit("conversation_error", {
        message: "Unable to join conversation",
      });
    }
  });

  socket.on("send_message", async (data) => {
    try {
      const { conversationId, content } = data || {};
      const id = Number(conversationId);

      if (!Number.isInteger(id) || id <= 0) {
        socket.emit("message_error", {
          message: "Invalid conversation ID",
        });
        return;
      }

      if (typeof content !== "string" || !content.trim()) {
        socket.emit("message_error", {
          message: "Message content is required",
        });
        return;
      }

      const conversation = await prisma.conversation.findUnique({
        where: { id },
      });

      if (!conversation) {
        socket.emit("message_error", {
          message: "Conversation not found",
        });
        return;
      }

      let authorized = false;

      if (socket.user.type === "MEMBER") {
        authorized = conversation.memberId === socket.user.id;
      }

      if (socket.user.type === "TRAINER") {
        authorized = conversation.trainerId === socket.user.id;
      }

      if (!authorized) {
        socket.emit("message_error", {
          message: "You are not allowed to send messages in this conversation",
        });
        return;
      }

      const senderType = socket.user.type;
      const senderId = socket.user.id;

      const message = await sendMessage({
        conversationId: id,
        senderId,
        senderType,
        content: content.trim(),
      });

      io.to(`conversation:${id}`).emit("new_message", {
        message,
      });
    } catch (error) {
      console.error("Socket send message error:", error);

      socket.emit("message_error", {
        message: error.message || "Unable to send message",
      });
    }
  });

  socket.on("mark_messages_read", async (conversationId) => {
    try {
      const id = Number(conversationId);

      if (!Number.isInteger(id) || id <= 0) {
        socket.emit("read_error", {
          message: "Invalid conversation ID",
        });
        return;
      }

      const conversation = await prisma.conversation.findUnique({
        where: { id },
      });

      if (!conversation) {
        socket.emit("read_error", {
          message: "Conversation not found",
        });
        return;
      }

      let authorized = false;

      if (socket.user.type === "MEMBER") {
        authorized = conversation.memberId === socket.user.id;
      }

      if (socket.user.type === "TRAINER") {
        authorized = conversation.trainerId === socket.user.id;
      }

      if (!authorized) {
        socket.emit("read_error", {
          message: "You are not allowed to access this conversation",
        });
        return;
      }

      const senderTypeToMark =
        socket.user.type === "MEMBER" ? "TRAINER" : "MEMBER";

      const result = await prisma.message.updateMany({
        where: {
          conversationId: id,
          senderType: senderTypeToMark,
          isRead: false,
        },
        data: {
          isRead: true,
        },
      });

      socket.emit("messages_read", {
        conversationId: id,
        updatedCount: result.count,
      });

      console.log(
        `${socket.user.type} ${socket.user.id} marked ${result.count} messages as read in conversation ${id}`,
      );
    } catch (error) {
      console.error("Socket mark messages as read error:", error);

      socket.emit("read_error", {
        message: "Unable to mark messages as read",
      });
    }
  });

  socket.on("disconnect", () => {
    console.log(`Socket disconnected: ${socket.id}`);
  });
});

// =====================================================
// HTTP MIDDLEWARE AND ROUTES
// =====================================================

app.use(cors());

// Keep the Chapa webhook BEFORE express.json().
// The webhook may need the raw request body for verification.
app.post(
  "/api/payments/webhook",
  express.raw({ type: "application/json" }),
  (req, res, next) => {
    req.rawBody = req.body;
    next();
  },
  chapaWebhookController,
);

app.use(express.json());

app.use("/api/auth", authRoutes);
app.use("/api/users", userRoutes);
app.use("/api/admin", adminRoutes);
app.use("/api/gyms", gymRoutes);
app.use("/api/packages", packageRoutes);
app.use("/api/bookings", bookingRoutes);
app.use("/api/payments", paymentRoutes);
app.use("/api", providerPortalRoutes);
app.use("/api", checkInRoutes);
app.use("/api", payoutRoutes);
app.use("/api/chats", chatRoutes);

app.use("/api/orders", orderRoutes);
app.use("/api/checkout", checkoutRoutes);
app.use("/api/providers", providerRoutes);
app.use("/api/sessions", sessionRoutes);
app.use("/api/leaderboard", leaderboardRoutes);
app.use("/api/chatbot", chatbotRoutes);
app.use("/api/trainers", trainerRoutes);
app.use("/api/messages", messageRoutes);

// Health check
app.get("/", (req, res) => {
  res.status(200).json({
    success: true,
    server: "running",
  });
});

// Error handler must remain after the routes.
app.use(errorHandler);

const PORT = process.env.PORT || 5000;

// =====================================================
// V2 CHAT THREAD AUTHENTICATION
// =====================================================

chatIo.use((socket, next) => {
  try {
    const tokenFromAuth = socket.handshake.auth?.token;
    const authHeader = socket.handshake.headers.authorization;

    const token =
      tokenFromAuth ||
      (authHeader && authHeader.startsWith("Bearer ")
        ? authHeader.replace("Bearer ", "")
        : null);

    if (!token) {
      return next(new Error("Missing chat token"));
    }

    const payload = jwt.verify(token, process.env.JWT_SECRET);
    const role = payload.role || payload.type;

    const auth = {
      role,
      userId: payload.userId ?? payload.id,
      providerId: payload.providerId ?? payload.id,
      staffId: payload.staffId,
      gymId: payload.gymId,
      adminId: payload.adminId,
    };

    socket.data.auth = auth;
    socket.data.userId = auth.role === "MEMBER" ? Number(auth.userId) : null;

    socket.data.providerId = [
      "TRAINER",
      "PHYSIOTHERAPIST",
      "NUTRITION_CONSULTANT",
    ].includes(auth.role)
      ? Number(auth.providerId)
      : null;

    next();
  } catch (error) {
    next(new Error("Invalid or expired chat token"));
  }
});

// =====================================================
// V2 CHAT THREAD EVENTS
// =====================================================

chatIo.on("connection", (socket) => {
  socket.on("thread:join", async (data) => {
    const threadId = data?.threadId;

    try {
      const thread = await ensureThreadMembership(socket.data.auth, threadId);

      socket.join(`chat:${thread.id}`);

      socket.emit("thread:joined", {
        threadId: thread.id,
      });
    } catch (error) {
      socket.emit("chat:error", {
        code: error.code || "INTERNAL",
        message: error.message || "Unable to join thread",
      });
    }
  });

  socket.on("disconnect", () => {
    socket.data = {};
  });
});

// =====================================================
// V2 PENDING-ORDER EXPIRATION
// =====================================================

const ORDER_EXPIRATION_INTERVAL = 60 * 1000;

async function expirePendingOrders() {
  try {
    const result = await prisma.$transaction(async (tx) => {
      return expireStale(tx);
    });

    if (result?.expiredCount > 0) {
      console.log(`V2 expired pending bookings: ${result.expiredCount}`);
    }
  } catch (error) {
    console.error("V2 order expiration error:", error);
  }
}

// Start the HTTP server only once.
httpServer.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);

  // Run once at startup, then every minute.
  void expirePendingOrders();

  setInterval(expirePendingOrders, ORDER_EXPIRATION_INTERVAL);

  const TRAINER_SESSION_EXPIRATION_INTERVAL = 60 * 1000;
  setInterval(async () => {
    try {
      await expirePendingTrainerSessions();
    } catch (error) {
      console.error("Trainer session expiration error:", error);
    }
  }, TRAINER_SESSION_EXPIRATION_INTERVAL);
});
