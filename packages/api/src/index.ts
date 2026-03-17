/**
 * class-action-os — API Server
 *
 * Hono HTTP server that mounts all route groups and provides
 * CORS, error handling, request logging, and health checks.
 */

import { Hono } from "hono";
import { cors } from "hono/cors";
import { logger } from "hono/logger";
import { prettyJSON } from "hono/pretty-json";
import { serve } from "@hono/node-server";

import { casesRouter } from "./routes/cases.js";
import { matchesRouter } from "./routes/matches.js";
import { claimsRouter } from "./routes/claims.js";
import { usersRouter } from "./routes/users.js";
import { sourceHealthRouter } from "./routes/source-health.js";
import { notificationsRouter } from "./routes/notifications.js";
import { adminRouter } from "./routes/admin.js";

const app = new Hono();

// ─── Global Middleware ───────────────────────────────────────
app.use("*", logger());
app.use("*", prettyJSON());
app.use(
  "*",
  cors({
    origin: process.env.CORS_ORIGIN ?? "http://localhost:3000",
    allowMethods: ["GET", "POST", "PUT", "PATCH", "DELETE", "OPTIONS"],
    allowHeaders: ["Content-Type", "Authorization"],
    maxAge: 86400,
  })
);

// ─── Health Check ────────────────────────────────────────────
app.get("/health", (c) =>
  c.json({ status: "ok", timestamp: new Date().toISOString() })
);

// ─── Mount Routers ───────────────────────────────────────────
app.route("/api/cases", casesRouter);
app.route("/api/matches", matchesRouter);
app.route("/api/claims", claimsRouter);
app.route("/api/users", usersRouter);
app.route("/api/sources", sourceHealthRouter);
app.route("/api/notifications", notificationsRouter);
app.route("/api/admin", adminRouter);

// ─── Global Error Handler ────────────────────────────────────
app.onError((err, c) => {
  console.error(`[API Error] ${err.message}`, err.stack);
  return c.json(
    {
      error: "Internal Server Error",
      message: process.env.NODE_ENV === "development" ? err.message : undefined,
    },
    500
  );
});

// ─── 404 Handler ─────────────────────────────────────────────
app.notFound((c) =>
  c.json({ error: "Not Found", path: c.req.path }, 404)
);

// ─── Start Server ────────────────────────────────────────────
const port = parseInt(process.env.API_PORT ?? "4000", 10);

serve(
  {
    fetch: app.fetch,
    port,
  },
  (info) => {
    console.log(`
┌──────────────────────────────────────────┐
│  class-action-os API                     │
│  Running on http://localhost:${info.port}        │
│  Environment: ${process.env.NODE_ENV ?? "development"}             │
└──────────────────────────────────────────┘
    `);
  }
);

export default app;
