const express = require("express");
const cors = require("cors");
require("dotenv").config();

const authRoutes = require("./routes/auth.routes.js");
const userRoutes = require("./routes/user.routes.js");
const adminRoutes = require("./routes/admin.routes.js");
const gymRoutes = require("./routes/gym.routes.js");
const packageRoutes = require("./routes/packages.routes.js");
const bookingRoutes = require("./routes/booking.routes.js");
const paymentRoutes = require("./routes/payment.routes");
const { chapaWebhookController } = require("./controllers/payment.controller.js");

const app = express();

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
app.use((err, req, res, next) => {
  console.error(err.stack);

  res.status(500).json({
    success: false,
    message: "Something went wrong",
  });
});

// ========================================
// SERVER
// ========================================
const PORT = process.env.PORT || 5000;

app.listen(PORT, '0.0.0.0', () => {
  console.log(`Server running on port ${PORT}`);
});
