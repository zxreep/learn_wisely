import { Hono } from "hono";
import { bodyLimit } from "hono/body-limit";
import { secureHeaders } from "hono/secure-headers";
import { logger } from "hono/logger";
import { pingDb } from "./db";
import { errorBody } from "./errors";
import { authRoutes } from "./routes/auth";
import { boardRoutes } from "./routes/boards";
import { chatRoutes } from "./routes/chat";
import { coachRoutes } from "./routes/coach";
import { libraryRoutes } from "./routes/library";
import { profileRoutes } from "./routes/profile";
import { socialRoutes } from "./routes/social";
import type { AppHonoEnv } from "./types";

const app = new Hono<AppHonoEnv>();

app.use("*", logger());
app.use("*", secureHeaders({
  contentSecurityPolicy: {
    defaultSrc: ["'self'"], scriptSrc: ["'self'"], styleSrc: ["'self'"], imgSrc: ["'self'", "data:"],
    connectSrc: ["'self'"], fontSrc: ["'self'"], objectSrc: ["'none'"], baseUri: ["'self'"], frameAncestors: ["'none'"], formAction: ["'self'"],
  },
  referrerPolicy: "strict-origin-when-cross-origin",
  strictTransportSecurity: "max-age=31536000; includeSubDomains",
  xContentTypeOptions: "nosniff",
  xFrameOptions: "DENY",
}));
app.use("/api/*", bodyLimit({ maxSize: 64 * 1024, onError: (c) => c.json({ error: { code: "BODY_TOO_LARGE", message: "That request is too large." } }, 413) }));

app.get("/api/health", async (c) => {
  const configured = Boolean(c.env.MONGODB_URI);
  if (!configured) return c.json({ status: "degraded", database: { configured: false }, coach: { configured: Boolean(c.env.GROQ_API_KEY) } }, 503);
  try {
    const latencyMs = await pingDb(c.env);
    return c.json({ status: "ok", database: { configured: true, latencyMs }, coach: { configured: Boolean(c.env.GROQ_API_KEY) } });
  } catch (error) {
    console.error("Health check database failure", error);
    return c.json({ status: "degraded", database: { configured: true, reachable: false }, coach: { configured: Boolean(c.env.GROQ_API_KEY) } }, 503);
  }
});

app.route("/api/auth", authRoutes);
app.route("/api", profileRoutes);
app.route("/api", boardRoutes);
app.route("/api", libraryRoutes);
app.route("/api", socialRoutes);
app.route("/api", chatRoutes);
app.route("/api", coachRoutes);

app.notFound(async (c) => {
  if (c.req.path.startsWith("/api/")) return c.json({ error: { code: "NOT_FOUND", message: "API route not found." } }, 404);
  if (c.env.ASSETS) return c.env.ASSETS.fetch(c.req.raw);
  return c.text("Learn Wisely frontend is not built. Run npm run build.", 404);
});

app.onError((error, c) => {
  const result = errorBody(error);
  return c.json(result.body, result.status as any);
});

export default app;
