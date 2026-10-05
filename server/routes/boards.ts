import { Hono } from "hono";
import { ObjectId } from "mongodb";
import { boardCreateSchema, boardUpdateSchema, idSchema } from "../../shared/contracts";
import { requireAuth, requireCsrf, validateRequestOrigin } from "../auth";
import { AppError } from "../errors";
import { boardView } from "../serializers";
import type { AppHonoEnv } from "../types";

export const boardRoutes = new Hono<AppHonoEnv>();
boardRoutes.use("/*", requireAuth);

boardRoutes.get("/boards", async (c) => {
  const boards = await c.get("db").collection("boards").find({ userId: c.get("user")._id }).sort({ updatedAt: -1 }).limit(30).toArray();
  return c.json({ data: boards.map(boardView) });
});

boardRoutes.post("/boards", requireCsrf, async (c) => {
  validateRequestOrigin(c);
  const input = boardCreateSchema.parse(await c.req.json());
  const count = await c.get("db").collection("boards").countDocuments({ userId: c.get("user")._id });
  if (count >= 30) throw new AppError(422, "BOARD_LIMIT", "You can keep up to 30 boards.");
  const now = new Date();
  const result = await c.get("db").collection("boards").insertOne({ userId: c.get("user")._id, name: input.name, widgets: [], createdAt: now, updatedAt: now });
  const board = await c.get("db").collection("boards").findOne({ _id: result.insertedId });
  return c.json({ data: boardView(board) }, 201);
});

boardRoutes.patch("/boards/:id", requireCsrf, async (c) => {
  validateRequestOrigin(c);
  const id = idSchema.parse(c.req.param("id"));
  const input = boardUpdateSchema.parse(await c.req.json());
  const result = await c.get("db").collection("boards").findOneAndUpdate(
    { _id: new ObjectId(id), userId: c.get("user")._id },
    { $set: { ...input, updatedAt: new Date() } }, { returnDocument: "after" },
  );
  if (!result) throw new AppError(404, "BOARD_NOT_FOUND", "Board not found.");
  return c.json({ data: boardView(result) });
});

boardRoutes.delete("/boards/:id", requireCsrf, async (c) => {
  validateRequestOrigin(c);
  const id = idSchema.parse(c.req.param("id"));
  const result = await c.get("db").collection("boards").deleteOne({ _id: new ObjectId(id), userId: c.get("user")._id });
  if (!result.deletedCount) throw new AppError(404, "BOARD_NOT_FOUND", "Board not found.");
  return c.json({ data: { ok: true } });
});
