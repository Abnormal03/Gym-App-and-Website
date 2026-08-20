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

// CHAPA webhook
app.post(
  "/webhook/chapa",
  express.raw({ type: "application/json" }),
  chapaWebhookController
);


app.use(express.json());

app.get("/", (req, res) => {
  res.status(200).json({
    success: true,
    server: "running",
  });
});

// Routes
app.use("/api/auth", authRoutes);
app.use("/api/users", userRoutes);

app.use("/api/admin", adminRoutes);
app.use("/api/gyms", gymRoutes);
app.use("/api/packages", packageRoutes);
app.use("/api/bookings", bookingRoutes);
app.use("/api/payments", paymentRoutes);

// Global error handler (catches anything not caught in controllers)
app.use((err, req, res, next) => {
  console.error(err.stack);
  res.status(500).json({ success: false, message: "Something went wrong" });
});

app.listen(process.env.PORT || 5000, () => {
  console.log(`Server running on port ${process.env.PORT || 5000}`);
});
