const express = require("express");
const cors = require("cors");
const helmet = require("helmet");
const morgan = require("morgan");
const rateLimit = require("express-rate-limit");
require("dotenv").config();

const userRoutes = require("./routes/userRoutes");
const authRoutes = require("./routes/authRoutes");
const studentRoutes = require("./routes/studentRoutes");
const supervisorRoutes = require("./routes/supervisorRoutes");
const courseRoutes = require("./routes/courseRoutes");
const thesisRoutes = require("./routes/thesisRoutes");
const resultRoutes = require("./routes/resultRoutes");
const feeRoutes = require("./routes/feeRoutes");
const clearanceRoutes = require("./routes/clearanceRoutes");
const documentRoutes = require("./routes/documentRoutes");
const notificationRoutes = require("./routes/notificationRoutes");
const examRoutes = require("./routes/examRoutes");
const analyticsRoutes = require("./routes/analyticsRoutes");
const chatbotRoutes = require("./routes/chatbotRoutes");
const passListRoutes = require("./routes/passListRoutes");
const announcementRoutes = require("./routes/announcementRoutes");
const resourceRoutes = require("./routes/resourceRoutes");
const auditRoutes = require("./routes/auditRoutes");

const app = express();

// ── Security ──
app.use(helmet());

// ── CORS ──
const allowedOrigins = (process.env.CORS_ORIGINS || "http://localhost:5173").split(",");
app.use(cors({ origin: allowedOrigins, credentials: true }));

// ── Rate Limiting ──
app.use(rateLimit({ windowMs: 15 * 60 * 1000, max: 200 }));

// ── Parsing & Logging ──
app.use(express.json({ limit: "10mb" }));
app.use(express.urlencoded({ extended: true }));
app.use(morgan("dev"));

// ── Static uploads ──
app.use("/uploads", express.static(process.env.UPLOAD_DIR || "./uploads"));

// ── Routes ──
app.use("/api/auth", authRoutes);
app.use("/api/users", userRoutes);
app.use("/api/students", studentRoutes);
app.use("/api/supervisors", supervisorRoutes);
app.use("/api/courses", courseRoutes);
app.use("/api/thesis", thesisRoutes);
app.use("/api/results", resultRoutes);
app.use("/api/fees", feeRoutes);
app.use("/api/clearance", clearanceRoutes);
app.use("/api/documents", documentRoutes);
app.use("/api/notifications", notificationRoutes);
app.use("/api/exams", examRoutes);
app.use("/api/analytics", analyticsRoutes);
app.use("/api/chatbot", chatbotRoutes);
app.use("/api/passlist", passListRoutes);
app.use("/api/announcements", announcementRoutes);
app.use("/api/resources", resourceRoutes);
app.use("/api/audit-logs", auditRoutes);

// ── Health check ──
app.get("/api/health", (req, res) => res.json({ status: "ok", timestamp: new Date().toISOString() }));

// ── 404 Handler ──
app.use((req, res) => res.status(404).json({ error: "Route not found" }));

// ── Global Error Handler ──
app.use((err, req, res, next) => {
  console.error("Unhandled error:", err);
  res.status(500).json({ error: process.env.NODE_ENV === "production" ? "Internal server error" : err.message });
});

const PORT = process.env.PORT || 5000;
app.listen(PORT, () => console.log(`🚀 UMaT Postgrad API running on port ${PORT}`));
