import { Hono } from "hono";
import { ObjectId } from "mongodb";
import { conversationCreateSchema, idSchema, messageCreateSchema, type AuthorView, type ConversationView, type MessageView } from "../../shared/contracts";
import { requireAuth, requireCsrf, validateRequestOrigin } from "../auth";
import { AppError } from "../errors";
import { authorView } from "../serializers";
import type { AppHonoEnv, UserDoc } from "../types";

export const chatRoutes = new Hono<AppHonoEnv>();
chatRoutes.use("/*", requireAuth);

chatRoutes.get("/conversations", async (c) => {
  const db = c.get("db");
  const conversations = await db.collection("conversations").find({ participantIds: c.get("user")._id }).sort({ updatedAt: -1 }).limit(60).toArray();
  const allIds = [...new Set(conversations.flatMap((conversation) => conversation.participantIds.map((id: ObjectId) => id.toHexString())))].map((id) => new ObjectId(id));
  const users = await db.collection<UserDoc>("users").find({ _id: { $in: allIds } }).toArray();
  const userMap = new Map(users.map((user) => [user._id.toHexString(), authorView(user)]));
  const data: ConversationView[] = conversations.map((conversation) => {
    const participants = conversation.participantIds.flatMap((id: ObjectId) => userMap.get(id.toHexString()) || []);
    const other = participants.find((participant: AuthorView) => participant.id !== c.get("user")._id.toHexString());
    return {
      id: conversation._id.toHexString(), type: conversation.type,
      name: conversation.type === "direct" ? (other?.name || "Unavailable account") : conversation.name,
      participants, lastMessage: conversation.lastMessage ? { ...conversation.lastMessage, createdAt: conversation.lastMessage.createdAt.toISOString(), authorId: conversation.lastMessage.authorId.toHexString() } : null,
      updatedAt: conversation.updatedAt.toISOString(),
    };
  });
  return c.json({ data });
});

chatRoutes.post("/conversations", requireCsrf, async (c) => {
  validateRequestOrigin(c);
  const input = conversationCreateSchema.parse(await c.req.json());
  const db = c.get("db");
  const handles = [...new Set(input.handles.map((handle) => handle.toLowerCase()))];
  if (handles.includes(c.get("user").handleNormalized)) throw new AppError(422, "SELF_CHAT", "You are already part of every chat you create.");
  const people = await db.collection<UserDoc>("users").find({ handleNormalized: { $in: handles } }).toArray();
  const found = new Set(people.map((person) => person.handleNormalized));
  const missing = handles.filter((handle) => !found.has(handle));
  if (missing.length) throw new AppError(404, "USERS_NOT_FOUND", `Could not find: ${missing.map((handle) => `@${handle}`).join(", ")}`);
  const participantIds = [c.get("user")._id, ...people.map((person) => person._id)];
  if (input.type === "direct") {
    const existing = await db.collection("conversations").findOne({ type: "direct", $and: [{ participantIds: { $all: participantIds } }, { participantIds: { $size: 2 } }] });
    if (existing) return c.json({ data: { id: existing._id.toHexString() } });
  }
  const now = new Date();
  const result = await db.collection("conversations").insertOne({
    type: input.type, name: input.type === "group" ? input.name!.trim() : "", participantIds,
    createdBy: c.get("user")._id, createdAt: now, updatedAt: now, lastMessage: null,
  });
  return c.json({ data: { id: result.insertedId.toHexString() } }, 201);
});

chatRoutes.get("/conversations/:id/messages", async (c) => {
  const conversationId = new ObjectId(idSchema.parse(c.req.param("id")));
  const db = c.get("db");
  const conversation = await db.collection("conversations").findOne({ _id: conversationId, participantIds: c.get("user")._id });
  if (!conversation) throw new AppError(404, "CONVERSATION_NOT_FOUND", "Conversation not found.");
  const filter: Record<string, unknown> = { conversationId };
  const after = c.req.query("after");
  if (after) {
    const date = new Date(after);
    if (!Number.isNaN(date.getTime())) filter.createdAt = { $gt: date };
  }
  const messages = await db.collection("messages").find(filter).sort({ createdAt: 1 }).limit(300).toArray();
  const authorIds = [...new Set(messages.map((message) => message.authorId.toHexString()))].map((id) => new ObjectId(id));
  const users = await db.collection<UserDoc>("users").find({ _id: { $in: authorIds } }).toArray();
  const userMap = new Map(users.map((user) => [user._id.toHexString(), authorView(user)]));
  const data: MessageView[] = messages.flatMap((message) => {
    const author = userMap.get(message.authorId.toHexString());
    return author ? [{ id: message._id.toHexString(), body: message.body, author, createdAt: message.createdAt.toISOString(), mine: message.authorId.equals(c.get("user")._id) }] : [];
  });
  return c.json({ data });
});

chatRoutes.post("/conversations/:id/messages", requireCsrf, async (c) => {
  validateRequestOrigin(c);
  const conversationId = new ObjectId(idSchema.parse(c.req.param("id")));
  const input = messageCreateSchema.parse(await c.req.json());
  const db = c.get("db");
  const conversation = await db.collection("conversations").findOne({ _id: conversationId, participantIds: c.get("user")._id });
  if (!conversation) throw new AppError(404, "CONVERSATION_NOT_FOUND", "Conversation not found.");
  const now = new Date();
  const result = await db.collection("messages").insertOne({ conversationId, authorId: c.get("user")._id, body: input.body, createdAt: now });
  await db.collection("conversations").updateOne({ _id: conversationId }, { $set: { lastMessage: { body: input.body, authorId: c.get("user")._id, createdAt: now }, updatedAt: now } });
  return c.json({ data: { id: result.insertedId.toHexString(), body: input.body, author: authorView(c.get("user")), createdAt: now.toISOString(), mine: true } }, 201);
});

chatRoutes.patch("/conversations/:id", requireCsrf, async (c) => {
  validateRequestOrigin(c);
  const conversationId = new ObjectId(idSchema.parse(c.req.param("id")));
  const name = String((await c.req.json()).name || "").trim();
  if (!name || name.length > 60) throw new AppError(422, "INVALID_NAME", "Use a group name between 1 and 60 characters.");
  const result = await c.get("db").collection("conversations").updateOne({ _id: conversationId, type: "group", participantIds: c.get("user")._id }, { $set: { name, updatedAt: new Date() } });
  if (!result.matchedCount) throw new AppError(404, "CONVERSATION_NOT_FOUND", "Group chat not found.");
  return c.json({ data: { name } });
});
