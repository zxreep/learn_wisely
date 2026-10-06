import { Hono } from "hono";
import { ObjectId } from "mongodb";
import { idSchema, libraryCreateSchema, libraryUpdateSchema } from "../../shared/contracts";
import { requireAuth, requireCsrf, validateRequestOrigin } from "../auth";
import { AppError } from "../errors";
import { libraryItemView } from "../serializers";
import type { AppHonoEnv } from "../types";

export const libraryRoutes = new Hono<AppHonoEnv>();
libraryRoutes.use("/*", requireAuth);

libraryRoutes.get("/library", async (c) => {
  const filter: Record<string, unknown> = { userId: c.get("user")._id };
  const type = c.req.query("type");
  if (type && ["note", "deck", "quiz"].includes(type)) filter.type = type;
  const query = (c.req.query("query") || "").trim();
  if (query) {
    const safe = query.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
    filter.$or = [{ title: { $regex: safe, $options: "i" } }, { subject: { $regex: safe, $options: "i" } }];
  }
  const items = await c.get("db").collection("library_items").find(filter).sort({ updatedAt: -1 }).limit(100).toArray();
  return c.json({ data: items.map(libraryItemView) });
});

libraryRoutes.post("/library", requireCsrf, async (c) => {
  validateRequestOrigin(c);
  const input = libraryCreateSchema.parse(await c.req.json());
  const count = await c.get("db").collection("library_items").countDocuments({ userId: c.get("user")._id });
  if (count >= 500) throw new AppError(422, "LIBRARY_LIMIT", "Your library can hold up to 500 items on the free plan.");
  const now = new Date();
  const result = await c.get("db").collection("library_items").insertOne({ ...input, userId: c.get("user")._id, createdAt: now, updatedAt: now });
  const item = await c.get("db").collection("library_items").findOne({ _id: result.insertedId });
  return c.json({ data: libraryItemView(item) }, 201);
});

libraryRoutes.put("/library/:id", requireCsrf, async (c) => {
  validateRequestOrigin(c);
  const id = idSchema.parse(c.req.param("id"));
  const input = libraryUpdateSchema.parse(await c.req.json());
  const result = await c.get("db").collection("library_items").findOneAndReplace(
    { _id: new ObjectId(id), userId: c.get("user")._id },
    { ...input, userId: c.get("user")._id, createdAt: new Date(0), updatedAt: new Date() },
    { returnDocument: "before" },
  );
  if (!result) throw new AppError(404, "ITEM_NOT_FOUND", "Library item not found.");
  const updated = await c.get("db").collection("library_items").findOne({ _id: new ObjectId(id), userId: c.get("user")._id });
  if (updated) updated.createdAt = result.createdAt;
  await c.get("db").collection("library_items").updateOne({ _id: new ObjectId(id) }, { $set: { createdAt: result.createdAt } });
  return c.json({ data: libraryItemView({ ...updated, createdAt: result.createdAt }) });
});

libraryRoutes.delete("/library/:id", requireCsrf, async (c) => {
  validateRequestOrigin(c);
  const id = idSchema.parse(c.req.param("id"));
  const result = await c.get("db").collection("library_items").deleteOne({ _id: new ObjectId(id), userId: c.get("user")._id });
  if (!result.deletedCount) throw new AppError(404, "ITEM_NOT_FOUND", "Library item not found.");
  return c.json({ data: { ok: true } });
});
