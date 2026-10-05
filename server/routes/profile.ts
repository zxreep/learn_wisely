import { Hono } from "hono";
import { profileUpdateSchema, studySessionSchema } from "../../shared/contracts";
import { requireAuth, requireCsrf, validateRequestOrigin } from "../auth";
import { AppError } from "../errors";
import { authorView, userView } from "../serializers";
import type { AppHonoEnv, UserDoc } from "../types";

export const profileRoutes = new Hono<AppHonoEnv>();
profileRoutes.use("/*", requireAuth);

profileRoutes.get("/profile", async (c) => {
  const db = c.get("db");
  const user = c.get("user");
  const sessions = await db.collection("study_sessions").find({ userId: user._id }).sort({ createdAt: -1 }).limit(370).toArray();
  const totalMinutes = sessions.reduce((sum, session: any) => sum + session.durationMinutes, 0);
  const dates = new Set(sessions.map((session: any) => session.createdAt.toISOString().slice(0, 10)));
  const today = new Date();
  const todayKey = today.toISOString().slice(0, 10);
  let streak = 0;
  const cursor = new Date(Date.UTC(today.getUTCFullYear(), today.getUTCMonth(), today.getUTCDate()));
  if (!dates.has(todayKey)) cursor.setUTCDate(cursor.getUTCDate() - 1);
  while (dates.has(cursor.toISOString().slice(0, 10))) { streak += 1; cursor.setUTCDate(cursor.getUTCDate() - 1); }
  return c.json({ data: { user: userView(user, true), stats: { totalMinutes, sessions: sessions.length, streak, studiedToday: dates.has(todayKey), xp: totalMinutes * 2 } } });
});

profileRoutes.patch("/profile", requireCsrf, async (c) => {
  validateRequestOrigin(c);
  const input = profileUpdateSchema.parse(await c.req.json());
  const db = c.get("db");
  const user = c.get("user");
  const update: Record<string, unknown> = { ...input, updatedAt: new Date() };
  if (input.handle) update.handleNormalized = input.handle;
  try {
    await db.collection<UserDoc>("users").updateOne({ _id: user._id }, { $set: update });
  } catch (error: any) {
    if (error?.code === 11000) throw new AppError(409, "HANDLE_IN_USE", "That handle is already taken.");
    throw error;
  }
  const updated = await db.collection<UserDoc>("users").findOne({ _id: user._id });
  return c.json({ data: { user: userView(updated!, true) } });
});

profileRoutes.post("/study-sessions", requireCsrf, async (c) => {
  validateRequestOrigin(c);
  const input = studySessionSchema.parse(await c.req.json());
  const user = c.get("user");
  const result = await c.get("db").collection("study_sessions").insertOne({ userId: user._id, ...input, createdAt: new Date() });
  return c.json({ data: { id: result.insertedId.toHexString(), ...input } }, 201);
});

profileRoutes.get("/users", async (c) => {
  const query = (c.req.query("query") || "").trim().toLowerCase();
  if (query.length < 2) return c.json({ data: [] });
  const safe = query.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  const users = await c.get("db").collection<UserDoc>("users").find({
    _id: { $ne: c.get("user")._id },
    $or: [{ handleNormalized: { $regex: `^${safe}` } }, { name: { $regex: safe, $options: "i" } }],
  }).limit(8).toArray();
  return c.json({ data: users.map(authorView) });
});

profileRoutes.get("/users/:handle", async (c) => {
  const user = await c.get("db").collection<UserDoc>("users").findOne({ handleNormalized: c.req.param("handle").toLowerCase() });
  if (!user) throw new AppError(404, "USER_NOT_FOUND", "Profile not found.");
  const stats = await c.get("db").collection("study_sessions").aggregate([
    { $match: { userId: user._id } },
    { $group: { _id: null, totalMinutes: { $sum: "$durationMinutes" }, sessions: { $sum: 1 } } },
  ]).next();
  return c.json({ data: { user: userView(user, false), stats: { totalMinutes: stats?.totalMinutes || 0, sessions: stats?.sessions || 0 } } });
});

profileRoutes.delete("/profile", requireCsrf, async (c) => {
  validateRequestOrigin(c);
  const db = c.get("db");
  const userId = c.get("user")._id;
  const ownedCommunities = await db.collection("communities").find({ ownerId: userId }).project({ _id: 1 }).toArray();
  if (ownedCommunities.length) throw new AppError(409, "TRANSFER_COMMUNITIES", "Delete communities you own before deleting your account.");

  const [conversations, memberships, ownPosts, commentCounts, ownVotes] = await Promise.all([
    db.collection("conversations").find({ participantIds: userId }).project({ _id: 1, type: 1 }).toArray(),
    db.collection("community_members").find({ userId }).project({ communityId: 1 }).toArray(),
    db.collection("posts").find({ authorId: userId }).project({ _id: 1 }).toArray(),
    db.collection("comments").aggregate([{ $match: { authorId: userId } }, { $group: { _id: "$postId", count: { $sum: 1 } } }]).toArray(),
    db.collection("votes").find({ userId }).project({ postId: 1, value: 1 }).toArray(),
  ]);
  const postIds = ownPosts.map((post) => post._id);
  const directIds = conversations.filter((conversation) => conversation.type === "direct").map((conversation) => conversation._id);
  const groupIds = conversations.filter((conversation) => conversation.type === "group").map((conversation) => conversation._id);

  if (memberships.length) await db.collection("communities").bulkWrite(memberships.map((membership) => ({ updateOne: { filter: { _id: membership.communityId }, update: { $inc: { memberCount: -1 } } } })));
  if (commentCounts.length) await db.collection("posts").bulkWrite(commentCounts.map((entry) => ({ updateOne: { filter: { _id: entry._id, authorId: { $ne: userId } }, update: { $inc: { commentCount: -entry.count } } } })));
  if (ownVotes.length) await db.collection("posts").bulkWrite(ownVotes.map((vote) => ({ updateOne: { filter: { _id: vote.postId, authorId: { $ne: userId } }, update: { $inc: { score: -vote.value } } } })));

  await Promise.all([
    db.collection("sessions").deleteMany({ userId }), db.collection("boards").deleteMany({ userId }),
    db.collection("library_items").deleteMany({ userId }), db.collection("community_members").deleteMany({ userId }),
    db.collection("votes").deleteMany({ $or: [{ userId }, { postId: { $in: postIds } }] }),
    db.collection("comments").deleteMany({ $or: [{ authorId: userId }, { postId: { $in: postIds } }] }),
    db.collection("posts").deleteMany({ authorId: userId }), db.collection("study_sessions").deleteMany({ userId }),
    db.collection("coach_messages").deleteMany({ userId }), db.collection("messages").deleteMany({ $or: [{ authorId: userId }, { conversationId: { $in: directIds } }] }),
    db.collection("conversations").deleteMany({ _id: { $in: directIds } }),
    db.collection<{ participantIds: import("mongodb").ObjectId[]; updatedAt: Date }>("conversations").updateMany({ _id: { $in: groupIds } }, { $pull: { participantIds: userId }, $set: { updatedAt: new Date() } }),
    db.collection("conversations").updateMany({ _id: { $in: groupIds }, "lastMessage.authorId": userId }, { $set: { lastMessage: null } }),
    db.collection("conversations").updateMany({ _id: { $in: groupIds }, createdBy: userId }, { $unset: { createdBy: "" } }),
  ]);
  await db.collection<UserDoc>("users").deleteOne({ _id: userId });
  return c.json({ data: { ok: true } });
});
