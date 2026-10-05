import type { Db } from "mongodb";
import { AppError } from "./errors";

export async function enforceRateLimit(db: Db, key: string, limit: number, windowSeconds: number): Promise<void> {
  const now = new Date();
  const windowStart = Math.floor(now.getTime() / (windowSeconds * 1000)) * windowSeconds * 1000;
  const bucketKey = `${key}:${windowStart}`;
  const expiresAt = new Date(windowStart + windowSeconds * 1000 + 60_000);
  const result = await db.collection("rate_limits").findOneAndUpdate(
    { key: bucketKey },
    { $inc: { count: 1 }, $setOnInsert: { expiresAt, createdAt: now } },
    { upsert: true, returnDocument: "after" },
  );
  if ((result?.count || 0) > limit) throw new AppError(429, "RATE_LIMITED", "Too many requests. Please wait a moment and try again.");
}
