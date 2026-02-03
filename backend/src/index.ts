/**
 * HR Autopilot API entry point.
 * Mounts auth, jobs, candidates, evaluations, audit, and chat routes under API_PREFIX.
 * Uses CORS and request logging; verifies email config on startup.
 */
import { Hono } from "hono";
import { cors } from "hono/cors";
import { logger } from "hono/logger";
import { settings } from "./config.js";
import { EmailService } from "./services/emailService.js";
import jobs from "./routes/jobs.js";
import candidates from "./routes/candidates.js";
import evaluations from "./routes/evaluations.js";
import audit from "./routes/audit.js";
import chat from "./routes/chat.js";
import auth from "./routes/auth.js";

const app = new Hono();

// Middleware
app.use("*", logger());
app.use(
  "*",
  cors({
    origin: settings.corsOrigins,
    allowMethods: ["GET", "POST", "PUT", "PATCH", "DELETE", "OPTIONS"],
    allowHeaders: ["Content-Type", "Authorization"],
    credentials: true,
  })
);

// Health check routes
app.get("/", (c) => {
  return c.json({ message: "HR Autopilot API", version: "1.0.0" });
});

app.get("/health", (c) => {
  return c.json({ status: "healthy" });
});

// API routes
app.route(settings.apiPrefix, auth);
app.route(settings.apiPrefix, jobs);
app.route(settings.apiPrefix, candidates);
app.route(settings.apiPrefix, evaluations);
app.route(settings.apiPrefix, audit);
app.route(settings.apiPrefix, chat);

// Verify email configuration on startup
const emailService = new EmailService();
emailService.verifyConnection().catch(() => {
  console.warn("⚠️  Email service configuration may be incorrect. Email sending may fail.");
});

const port = parseInt(process.env.PORT || "8000");

console.log(`🚀 Server starting on http://localhost:${port}`);
console.log(`📚 API available at http://localhost:${port}${settings.apiPrefix}`);

// Bun automatically serves when default export has port and fetch
export default {
  port,
  fetch: app.fetch,
  // Increase timeout for long-running operations like LLM evaluations
  // Bun's maximum idleTimeout is 255 seconds
  idleTimeout: 255, // ~4.25 minutes - maximum allowed by Bun
};
