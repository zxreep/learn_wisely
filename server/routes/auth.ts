import { Hono } from "hono";
import { deleteCookie, getCookie, setCookie } from "hono/cookie";
import type { Db } from "mongodb";
import { loginSchema, signupSchema } from "../../shared/contracts";
import { createSession, hashPassword, randomToken, requireAuth, requireCsrf, sha256, validateRequestOrigin, verifyPassword } from "../auth";
import { getDb } from "../db";
import { AppError } from "../errors";
import { enforceRateLimit } from "../rate-limit";
import { userView } from "../serializers";
import type { AppHonoEnv, SessionDoc, UserDoc } from "../types";

export const authRoutes = new Hono<AppHonoEnv>();

function setSessionCookies(c: any, token: string, csrf: string, expiresAt: Date): void {
  const secure = new URL(c.req.url).protocol === "https:";
  setCookie(c, secure ? "__Host-learn_session" : "learn_session", token, {
    httpOnly: true, secure, sameSite: "Strict", path: "/", expires: expiresAt,
  });
  setCookie(c, "learn_csrf", csrf, { httpOnly: false, secure, sameSite: "Strict", path: "/", expires: expiresAt });
}

async function rotateCsrf(c: any, db: Db, session: SessionDoc): Promise<void> {
  const csrf = randomToken(24);
  await db.collection<SessionDoc>("sessions").updateOne({ _id: session._id }, { $set: { csrfHash: await sha256(csrf) } });
  const secure = new URL(c.req.url).protocol === "https:";
  setCookie(c, "learn_csrf", csrf, { httpOnly: false, secure, sameSite: "Strict", path: "/", expires: session.expiresAt });
}

function requestIdentity(c: any): string {
  return c.req.header("cf-connecting-ip") || c.req.header("x-forwarded-for")?.split(",")[0]?.trim() || "unknown";
}

authRoutes.post("/signup", async (c) => {
  validateRequestOrigin(c);
  const input = signupSchema.parse(await c.req.json());
  const db = await getDb(c.env);
  await enforceRateLimit(db, `signup:${requestIdentity(c)}`, 5, 900);
  const existing = await db.collection<UserDoc>("users").findOne({ $or: [{ emailNormalized: input.email }, { handleNormalized: input.handle }] });
  if (existing?.emailNormalized === input.email) throw new AppError(409, "EMAIL_IN_USE", "An account already uses that email.");
  if (existing) throw new AppError(409, "HANDLE_IN_USE", "That handle is already taken.");
  const password = await hashPassword(input.password);
  const now = new Date();
  let inserted;
  try {
    inserted = await db.collection<UserDoc>("users").insertOne({
      email: input.email, emailNormalized: input.email, passwordHash: password.hash, passwordSalt: password.salt,
      name: input.name, handle: input.handle, handleNormalized: input.handle, bio: "", avatarColor: "gold",
      theme: "system", reduceMotion: false, dailyGoalMinutes: 30, subjects: [], exams: [], onboarded: false,
      createdAt: now, updatedAt: now,
    } as unknown as UserDoc);
  } catch (error: any) {
    if (error?.code === 11000) throw new AppError(409, "ACCOUNT_EXISTS", "That email or handle is already in use.");
    throw error;
  }
  const session = await createSession(db, inserted.insertedId);
  setSessionCookies(c, session.token, session.csrf, session.expiresAt);
  const user = await db.collection<UserDoc>("users").findOne({ _id: inserted.insertedId });
  return c.json({ data: { user: userView(user!, true) } }, 201);
});

authRoutes.post("/login", async (c) => {
  validateRequestOrigin(c);
  const input = loginSchema.parse(await c.req.json());
  const db = await getDb(c.env);
  await enforceRateLimit(db, `login:${requestIdentity(c)}`, 10, 900);
  const user = await db.collection<UserDoc>("users").findOne({ emailNormalized: input.email });
  if (!user || !await verifyPassword(input.password, user.passwordSalt, user.passwordHash)) {
    throw new AppError(401, "INVALID_CREDENTIALS", "Email or password is incorrect.");
  }
  const session = await createSession(db, user._id);
  setSessionCookies(c, session.token, session.csrf, session.expiresAt);
  return c.json({ data: { user: userView(user, true) } });
});

authRoutes.get("/me", requireAuth, async (c) => {
  if (!getCookie(c, "learn_csrf")) await rotateCsrf(c, c.get("db"), c.get("session"));
  return c.json({ data: { user: userView(c.get("user"), true) } });
});

authRoutes.post("/logout", requireAuth, requireCsrf, async (c) => {
  validateRequestOrigin(c);
  await c.get("db").collection<SessionDoc>("sessions").deleteOne({ _id: c.get("session")._id });
  deleteCookie(c, "__Host-learn_session", { path: "/", secure: true });
  deleteCookie(c, "learn_session", { path: "/" });
  deleteCookie(c, "learn_csrf", { path: "/" });
  return c.json({ data: { ok: true } });
});
