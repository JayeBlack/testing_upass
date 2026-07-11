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
const departmentRoutes = require("./routes/departmentRoutes");
const programRoutes = require("./routes/programRoutes");

const app = express();

// ── Security ──
const allowedOrigins = (process.env.CORS_ORIGINS || "http://localhost:5173").split(",");
// Apply helmet with secure defaults globally
app.use(helmet({
  contentSecurityPolicy: {
    directives: {
      defaultSrc: ["'self'"],
      scriptSrc: ["'self'"],
      styleSrc: ["'self'", "'unsafe-inline'"],
      imgSrc: ["'self'", "data:", "https://res.cloudinary.com"],
      connectSrc: ["'self'", ...allowedOrigins],
      frameSrc: ["'self'", "https://res.cloudinary.com"],
      objectSrc: ["'none'"],
      upgradeInsecureRequests: [],
    },
  },
}));
// Per-route override for PDF preview endpoints that require iframe embedding
const pdfPreviewHeaders = (req, res, next) => {
  res.setHeader("X-Frame-Options", "SAMEORIGIN");
  res.setHeader("Cross-Origin-Resource-Policy", "cross-origin");
  next();
};

// ── CORS ──
app.use(cors({ origin: allowedOrigins, credentials: true }));

// ── Rate Limiting ──
app.get("/api/health", (req, res) => res.json({ status: "ok", timestamp: new Date().toISOString() }));
// General: 300 req/15min per IP
app.use(rateLimit({ windowMs: 15 * 60 * 1000, max: 300, standardHeaders: true, legacyHeaders: false }));
// Auth: 20 login attempts per 15min per IP
const authLimiter = rateLimit({ windowMs: 15 * 60 * 1000, max: 20, standardHeaders: true, legacyHeaders: false });
// Sensitive data endpoints: 100 req/15min
const dataLimiter = rateLimit({ windowMs: 15 * 60 * 1000, max: 100, standardHeaders: true, legacyHeaders: false });

// ── Parsing & Logging ──
app.use(express.json({ limit: "10mb" }));
app.use(express.urlencoded({ extended: true }));
app.use(morgan("dev"));

// ── Static uploads ──
// NOTE: /uploads is intentionally NOT served as static — files are served through
// authenticated controller endpoints to prevent unauthenticated file access.

// ── Routes ──
app.use("/api/auth", authLimiter, authRoutes);
app.use("/api/users", userRoutes);
app.use("/api/students", studentRoutes);
app.use("/api/supervisors", supervisorRoutes);
app.use("/api/courses", courseRoutes);
app.use("/api/thesis", thesisRoutes);
app.use("/api/results", resultRoutes);
app.use("/api/fees", dataLimiter, feeRoutes);
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
app.use("/api/departments", departmentRoutes);
app.use("/api/programs", programRoutes);

// ── 404 Handler ──
app.use((req, res) => res.status(404).json({ error: "Route not found" }));

// ── Global Error Handler ──
app.use((err, req, res, next) => {
  console.error("Unhandled error:", err);
  res.status(500).json({ error: process.env.NODE_ENV === "production" ? "Internal server error" : err.message });
});

const PORT = process.env.PORT || 5000;
app.listen(PORT, () => console.log(`🚀 UMaT Postgrad API running on port ${PORT}`));
