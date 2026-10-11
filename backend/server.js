const express = require("express");
const cors = require("cors");
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
app.use("/api", providerPortalRoutes);
app.use("/api", checkInRoutes);
app.use("/api", payoutRoutes);

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

app.listen(PORT, "0.0.0.0", () => {
  console.log(`Server running on port ${PORT}`);
});
