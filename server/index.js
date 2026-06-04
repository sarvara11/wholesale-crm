require("dotenv").config();
const express = require("express");
const cookieParser = require("cookie-parser");
const helmet = require("helmet");
const morgan = require("morgan");
const cors = require("cors");
const rateLimit = require("express-rate-limit");
const path = require("path");
const connectDB = require("./config/db");

const app = express();

// ── Security & parsing middleware ─────────────────────────────────────────────
app.use(
  helmet({
    contentSecurityPolicy: {
      directives: {
        defaultSrc: ["'self'"],
        scriptSrc:  ["'self'", "'unsafe-inline'", "'unsafe-eval'",
                     "https://cdn.tailwindcss.com",
                     "https://cdn.jsdelivr.net",
                     "https://cdnjs.cloudflare.com"],
        styleSrc:   ["'self'", "'unsafe-inline'",
                     "https://cdn.tailwindcss.com",
                     "https://cdn.jsdelivr.net",
                     "https://cdnjs.cloudflare.com",
                     "https://fonts.googleapis.com"],
        fontSrc:    ["'self'", "https://fonts.gstatic.com", "https://cdnjs.cloudflare.com"],
        imgSrc:     ["'self'", "data:", "https:"],
        connectSrc: ["'self'"],
      },
    },
  })
);

const allowedOrigins = (process.env.CORS_ORIGINS || "")
  .split(",")
  .map((o) => o.trim())
  .filter(Boolean);

app.use(
  cors({
    origin: allowedOrigins.length ? allowedOrigins : false,
    credentials: true,
  })
);

app.use(morgan(process.env.NODE_ENV === "production" ? "combined" : "dev"));
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(cookieParser());

// ── Rate limiting ─────────────────────────────────────────────────────────────
app.use(
  "/api/auth",
  rateLimit({ windowMs: 15 * 60 * 1000, max: 20, standardHeaders: true, legacyHeaders: false })
);
app.use(
  "/api",
  rateLimit({ windowMs: 60 * 1000, max: 200, standardHeaders: true, legacyHeaders: false })
);

// ── Health check (load-balancer probe) ────────────────────────────────────────
app.get("/health", (_req, res) => {
  res.json({ status: "ok", uptime: process.uptime(), timestamp: new Date().toISOString() });
});

// ── API routes (wired up in later steps) ─────────────────────────────────────
app.use("/api/auth",         require("./routes/auth"));
app.use("/api/users",        require("./routes/users"));
app.use("/api/customers",    require("./routes/customers"));
app.use("/api/leads",        require("./routes/leads"));
app.use("/api/opportunities",require("./routes/opportunities"));
app.use("/api/activities",   require("./routes/activities"));
app.use("/api/inventory",    require("./routes/inventory"));
app.use("/api/audit-logs",   require("./routes/auditLogs"));
app.use("/api/reports",      require("./routes/reports"));

// ── Serve static frontend ─────────────────────────────────────────────────────
app.use(express.static(path.join(__dirname, "../public")));

// SPA catch-all: unknown paths serve index.html so client-side routing works
app.get("*", (req, res) => {
  if (req.path.startsWith("/api")) {
    return res.status(404).json({ error: "API route not found" });
  }
  res.sendFile(path.join(__dirname, "../public/index.html"));
});

// ── Global error handler ──────────────────────────────────────────────────────
app.use((err, _req, res, _next) => {
  console.error(err.stack);
  res.status(err.status || 500).json({ error: err.message || "Internal server error" });
});

// ── Boot ──────────────────────────────────────────────────────────────────────
const PORT = process.env.PORT || 3000;

connectDB()
  .then(() => {
    app.listen(PORT, () => console.log(`CRM server running on port ${PORT} [${process.env.NODE_ENV}]`));
  })
  .catch((err) => {
    console.error("Failed to connect to MongoDB:", err.message);
    process.exit(1);
  });

module.exports = app;
