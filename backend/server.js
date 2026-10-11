const express = require("express");
const cors = require("cors");
const http = require("http");
const jwt = require("jsonwebtoken");
const { Server } = require("socket.io");
require("dotenv").config();

const authRoutes = require("./routes/auth.routes.js");
const userRoutes = require("./routes/user.routes.js");
const adminRoutes = require("./routes/admin.routes.js");
const gymRoutes = require("./routes/gym.routes.js");
const packageRoutes = require("./routes/packages.routes.js");
const bookingRoutes = require("./routes/booking.routes.js");
const orderRoutes = require("./routes/order.routes");
const paymentRoutes = require("./routes/payment.routes");
const providerPortalRoutes = require("./routes/providerPortal.routes");
const { chapaWebhookController } = require("./controllers/payment.controller.js");
const { errorHandler } = require("./utils/responses");
const checkoutRoutes = require("./routes/checkout.routes");
const sessionRoutes = require("./routes/session.routes");
const providerRoutes = require("./routes/provider.routes.js");
const checkInRoutes = require("./routes/checkIn.routes.js");
const payoutRoutes = require("./routes/payout.routes.js");
const chatRoutes = require("./routes/chat.routes.js");
const { ensureThreadMembership } = require("./services/chatThread.service");

const app = express();
const httpServer = http.createServer(app);
const io = new Server(httpServer, {
  cors: {
    origin: "*",
    methods: ["GET", "POST"],
  },
});
const chatIo = io.of("/chat");
app.locals.io = chatIo;

app.use(cors());

// ========================================
// CHAPA WEBHOOK
// MUST COME BEFORE express.json()
// ========================================
app.post(
  "/api/payments/webhook",
  express.raw({
    type: "application/json",
  }),
  (req, res, next) => {
    req.rawBody = req.body;
    next();
  },
  chapaWebhookController,
);

// ========================================
// NORMAL JSON REQUESTS
// ========================================
app.use(express.json());

// ========================================
// ROUTES
// ========================================
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
// ========================================
// HEALTH CHECK
// ========================================
app.get("/", (req, res) => {
  res.status(200).json({
    success: true,
    server: "running",
  });
});

// ========================================
// ERROR HANDLER
// ========================================
app.use(errorHandler);

// ========================================
// SERVER
// ========================================
const PORT = process.env.PORT || 5000;

chatIo.use((socket, next) => {
  try {
    const tokenFromAuth = socket.handshake.auth?.token;
    const authHeader = socket.handshake.headers.authorization;
    const token = tokenFromAuth || (authHeader && authHeader.startsWith("Bearer ") ? authHeader.replace("Bearer ", "") : null);

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
    socket.data.providerId = ["TRAINER", "PHYSIOTHERAPIST", "NUTRITION_CONSULTANT"].includes(auth.role) ? Number(auth.providerId) : null;
    next();
  } catch (error) {
    next(new Error("Invalid or expired chat token"));
  }
});

chatIo.on("connection", (socket) => {
  socket.on("thread:join", async (data) => {
    const threadId = data?.threadId;
    try {
      const thread = await ensureThreadMembership(socket.data.auth, threadId);
      socket.join(`chat:${thread.id}`);
      socket.emit("thread:joined", { threadId: thread.id });
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

httpServer.listen(PORT, "0.0.0.0", () => {
  console.log(`Server running on port ${PORT}`);
});
