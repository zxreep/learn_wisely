import { MongoClient, ServerApiVersion, type Db } from "mongodb";
import { AppError } from "./errors";
import type { Env } from "./types";

let client: MongoClient | undefined;
let database: Db | undefined;
let indexesReady: Promise<void> | undefined;
let activeUri: string | undefined;

export async function getDb(env: Env): Promise<Db> {
  if (!env.MONGODB_URI) throw new AppError(503, "DATABASE_NOT_CONFIGURED", "The database is not configured yet.");
  if (database && activeUri === env.MONGODB_URI) return database;

  client = new MongoClient(env.MONGODB_URI, {
    appName: "learn-wisely-cloudflare",
    maxPoolSize: 3,
    minPoolSize: 0,
    maxIdleTimeMS: 60_000,
    serverSelectionTimeoutMS: 7_000,
    connectTimeoutMS: 7_000,
    serverApi: { version: ServerApiVersion.v1, strict: true, deprecationErrors: true },
  });
  await client.connect();
  activeUri = env.MONGODB_URI;
  database = client.db(env.MONGODB_DB || "learn_wisely");
  indexesReady = ensureIndexes(database);
  await indexesReady;
  return database;
}

async function ensureIndexes(db: Db): Promise<void> {
  await Promise.all([
    db.collection("users").createIndexes([
      { key: { emailNormalized: 1 }, name: "users_email_unique", unique: true },
      { key: { handleNormalized: 1 }, name: "users_handle_unique", unique: true },
    ]),
    db.collection("sessions").createIndexes([
      { key: { tokenHash: 1 }, name: "sessions_token_unique", unique: true },
      { key: { expiresAt: 1 }, name: "sessions_expiry_ttl", expireAfterSeconds: 0 },
      { key: { userId: 1 }, name: "sessions_user" },
    ]),
    db.collection("boards").createIndex({ userId: 1, updatedAt: -1 }, { name: "boards_by_user" }),
    db.collection("library_items").createIndex({ userId: 1, updatedAt: -1 }, { name: "library_by_user" }),
    db.collection("communities").createIndexes([
      { key: { slug: 1 }, name: "community_slug_unique", unique: true },
      { key: { name: "text", description: "text" }, name: "community_search" },
    ]),
    db.collection("community_members").createIndexes([
      { key: { communityId: 1, userId: 1 }, name: "community_members_unique", unique: true },
      { key: { userId: 1, joinedAt: -1 }, name: "communities_by_member" },
    ]),
    db.collection("posts").createIndex({ communityId: 1, createdAt: -1 }, { name: "posts_by_community" }),
    db.collection("comments").createIndex({ postId: 1, createdAt: 1 }, { name: "comments_by_post" }),
    db.collection("votes").createIndex({ postId: 1, userId: 1 }, { name: "votes_unique", unique: true }),
    db.collection("conversations").createIndex({ participantIds: 1, updatedAt: -1 }, { name: "conversations_by_participant" }),
    db.collection("messages").createIndex({ conversationId: 1, createdAt: 1 }, { name: "messages_by_conversation" }),
    db.collection("study_sessions").createIndex({ userId: 1, createdAt: -1 }, { name: "study_sessions_by_user" }),
    db.collection("coach_messages").createIndex({ userId: 1, createdAt: -1 }, { name: "coach_messages_by_user" }),
    db.collection("rate_limits").createIndexes([
      { key: { key: 1 }, name: "rate_limit_key_unique", unique: true },
      { key: { expiresAt: 1 }, name: "rate_limit_expiry_ttl", expireAfterSeconds: 0 },
    ]),
  ]);
}

export async function pingDb(env: Env): Promise<number> {
  const started = Date.now();
  const db = await getDb(env);
  await db.command({ ping: 1 });
  return Date.now() - started;
}

export function resetDbForTests(): void {
  client = undefined;
  database = undefined;
  indexesReady = undefined;
  activeUri = undefined;
}
