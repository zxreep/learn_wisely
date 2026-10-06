import type { Context, MiddlewareHandler } from "hono";
import { getCookie } from "hono/cookie";
import type { ObjectId } from "mongodb";
import { getDb } from "./db";
import { AppError } from "./errors";
import type { AppVariables, Env, SessionDoc, UserDoc } from "./types";

const encoder = new TextEncoder();
const PASSWORD_ITERATIONS = 210_000;
const SESSION_DAYS = 30;

function bytesToBase64(bytes: Uint8Array): string {
  let binary = "";
  for (const byte of bytes) binary += String.fromCharCode(byte);
  return btoa(binary);
}
function base64ToBytes(value: string): Uint8Array {
  const binary = atob(value);
  return Uint8Array.from(binary, (char) => char.charCodeAt(0));
}
export function randomToken(byteLength = 32): string {
  return bytesToBase64(crypto.getRandomValues(new Uint8Array(byteLength))).replaceAll("+", "-").replaceAll("/", "_").replaceAll("=", "");
}
export async function sha256(value: string): Promise<string> {
  return bytesToBase64(new Uint8Array(await crypto.subtle.digest("SHA-256", encoder.encode(value))));
}
export async function hashPassword(password: string, salt = randomToken(18)): Promise<{ hash: string; salt: string }> {
  const material = await crypto.subtle.importKey("raw", encoder.encode(password), "PBKDF2", false, ["deriveBits"]);
  const bits = await crypto.subtle.deriveBits({ name: "PBKDF2", hash: "SHA-256", salt: encoder.encode(salt), iterations: PASSWORD_ITERATIONS }, material, 256);
  return { hash: bytesToBase64(new Uint8Array(bits)), salt };
}
export async function verifyPassword(password: string, salt: string, expectedHash: string): Promise<boolean> {
  const { hash } = await hashPassword(password, salt);
  const left = base64ToBytes(hash);
  const right = base64ToBytes(expectedHash);
  if (left.length !== right.length) return false;
  let difference = 0;
  for (let index = 0; index < left.length; index += 1) difference |= left[index] ^ right[index];
  return difference === 0;
}

export async function createSession(db: import("mongodb").Db, userId: ObjectId): Promise<{ token: string; csrf: string; expiresAt: Date }> {
  const token = randomToken();
  const csrf = randomToken(24);
  const expiresAt = new Date(Date.now() + SESSION_DAYS * 86_400_000);
  await db.collection<SessionDoc>("sessions").insertOne({
    tokenHash: await sha256(token), csrfHash: await sha256(csrf), userId, createdAt: new Date(), expiresAt,
  } as SessionDoc);
  return { token, csrf, expiresAt };
}

function sessionCookie(c: Context): string | undefined {
  return getCookie(c, "__Host-learn_session") || getCookie(c, "learn_session");
}

export const requireAuth: MiddlewareHandler<{ Bindings: Env; Variables: AppVariables }> = async (c, next) => {
  const token = sessionCookie(c);
  if (!token) throw new AppError(401, "UNAUTHENTICATED", "Please sign in to continue.");
  const db = await getDb(c.env);
  const session = await db.collection<SessionDoc>("sessions").findOne({ tokenHash: await sha256(token), expiresAt: { $gt: new Date() } });
  if (!session) throw new AppError(401, "SESSION_EXPIRED", "Your session has expired. Please sign in again.");
  const user = await db.collection<UserDoc>("users").findOne({ _id: session.userId });
  if (!user) throw new AppError(401, "UNAUTHENTICATED", "This account is no longer available.");
  c.set("db", db);
  c.set("session", session);
  c.set("user", user);
  await next();
};

export const requireCsrf: MiddlewareHandler<{ Bindings: Env; Variables: AppVariables }> = async (c, next) => {
  const header = c.req.header("x-csrf-token");
  const cookie = getCookie(c, "learn_csrf");
  const session = c.get("session");
  if (!header || !cookie || header !== cookie || await sha256(header) !== session.csrfHash) {
    throw new AppError(403, "CSRF_INVALID", "The security token is missing or expired. Refresh and try again.");
  }
  await next();
};

export function validateRequestOrigin(c: Context): void {
  const origin = c.req.header("origin");
  const fetchSite = c.req.header("sec-fetch-site");
  if (fetchSite === "cross-site" || (origin && origin !== new URL(c.req.url).origin)) {
    throw new AppError(403, "ORIGIN_REJECTED", "Cross-site requests are not allowed.");
  }
}
