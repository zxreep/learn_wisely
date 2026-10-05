import { Hono } from "hono";
import { ObjectId, type Db } from "mongodb";
import { commentCreateSchema, communityCreateSchema, idSchema, postCreateSchema, voteSchema, type CommunityView, type PostView } from "../../shared/contracts";
import { requireAuth, requireCsrf, validateRequestOrigin } from "../auth";
import { AppError } from "../errors";
import { authorView } from "../serializers";
import type { AppHonoEnv, UserDoc } from "../types";

export const socialRoutes = new Hono<AppHonoEnv>();
socialRoutes.use("/*", requireAuth);

async function communityView(db: Db, community: any, userId: ObjectId): Promise<CommunityView> {
  const [owner, member] = await Promise.all([
    db.collection<UserDoc>("users").findOne({ _id: community.ownerId }),
    db.collection("community_members").findOne({ communityId: community._id, userId }),
  ]);
  if (!owner) throw new AppError(404, "OWNER_NOT_FOUND", "This community is not available.");
  return {
    id: community._id.toHexString(), name: community.name, slug: community.slug, description: community.description,
    memberCount: community.memberCount || 0, joined: Boolean(member), role: member?.role || null,
    createdAt: community.createdAt.toISOString(), owner: authorView(owner),
  };
}

async function requireMember(db: Db, communityId: ObjectId, userId: ObjectId): Promise<any> {
  const member = await db.collection("community_members").findOne({ communityId, userId });
  if (!member) throw new AppError(403, "MEMBERSHIP_REQUIRED", "Join this community to take part.");
  return member;
}

socialRoutes.get("/communities", async (c) => {
  const db = c.get("db");
  const filter: Record<string, unknown> = {};
  const query = (c.req.query("query") || "").trim();
  if (query) {
    const safe = query.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
    filter.$or = [{ name: { $regex: safe, $options: "i" } }, { description: { $regex: safe, $options: "i" } }];
  }
  if (c.req.query("joined") === "true") {
    const memberships = await db.collection("community_members").find({ userId: c.get("user")._id }).project({ communityId: 1 }).toArray();
    filter._id = { $in: memberships.map((membership) => membership.communityId) };
  }
  const communities = await db.collection("communities").find(filter).sort({ memberCount: -1, createdAt: -1 }).limit(50).toArray();
  return c.json({ data: await Promise.all(communities.map((community) => communityView(db, community, c.get("user")._id))) });
});

socialRoutes.post("/communities", requireCsrf, async (c) => {
  validateRequestOrigin(c);
  const input = communityCreateSchema.parse(await c.req.json());
  const db = c.get("db");
  const base = input.name.toLowerCase().normalize("NFKD").replace(/[^a-z0-9]+/g, "-").replace(/(^-|-$)/g, "").slice(0, 42) || "community";
  let slug = base;
  for (let suffix = 1; await db.collection("communities").findOne({ slug }); suffix += 1) slug = `${base}-${suffix}`;
  const now = new Date();
  const result = await db.collection("communities").insertOne({ ownerId: c.get("user")._id, ...input, slug, memberCount: 1, createdAt: now, updatedAt: now });
  await db.collection("community_members").insertOne({ communityId: result.insertedId, userId: c.get("user")._id, role: "owner", joinedAt: now });
  const community = await db.collection("communities").findOne({ _id: result.insertedId });
  return c.json({ data: await communityView(db, community, c.get("user")._id) }, 201);
});

socialRoutes.get("/communities/:id", async (c) => {
  const id = idSchema.parse(c.req.param("id"));
  const community = await c.get("db").collection("communities").findOne({ _id: new ObjectId(id) });
  if (!community) throw new AppError(404, "COMMUNITY_NOT_FOUND", "Community not found.");
  return c.json({ data: await communityView(c.get("db"), community, c.get("user")._id) });
});

socialRoutes.post("/communities/:id/join", requireCsrf, async (c) => {
  validateRequestOrigin(c);
  const communityId = new ObjectId(idSchema.parse(c.req.param("id")));
  const db = c.get("db");
  if (!await db.collection("communities").findOne({ _id: communityId })) throw new AppError(404, "COMMUNITY_NOT_FOUND", "Community not found.");
  try {
    await db.collection("community_members").insertOne({ communityId, userId: c.get("user")._id, role: "member", joinedAt: new Date() });
    await db.collection("communities").updateOne({ _id: communityId }, { $inc: { memberCount: 1 } });
  } catch (error: any) {
    if (error?.code !== 11000) throw error;
  }
  return c.json({ data: { joined: true } });
});

socialRoutes.delete("/communities/:id/membership", requireCsrf, async (c) => {
  validateRequestOrigin(c);
  const communityId = new ObjectId(idSchema.parse(c.req.param("id")));
  const db = c.get("db");
  const member = await db.collection("community_members").findOne({ communityId, userId: c.get("user")._id });
  if (member?.role === "owner") throw new AppError(409, "OWNER_CANNOT_LEAVE", "Delete the community instead of leaving it.");
  const result = await db.collection("community_members").deleteOne({ communityId, userId: c.get("user")._id });
  if (result.deletedCount) await db.collection("communities").updateOne({ _id: communityId }, { $inc: { memberCount: -1 } });
  return c.json({ data: { joined: false } });
});

socialRoutes.delete("/communities/:id", requireCsrf, async (c) => {
  validateRequestOrigin(c);
  const communityId = new ObjectId(idSchema.parse(c.req.param("id")));
  const db = c.get("db");
  const community = await db.collection("communities").findOne({ _id: communityId });
  if (!community) throw new AppError(404, "COMMUNITY_NOT_FOUND", "Community not found.");
  if (!community.ownerId.equals(c.get("user")._id)) throw new AppError(403, "FORBIDDEN", "Only the owner can delete this community.");
  const posts = await db.collection("posts").find({ communityId }).project({ _id: 1 }).toArray();
  const postIds = posts.map((post) => post._id);
  await Promise.all([
    db.collection("votes").deleteMany({ postId: { $in: postIds } }), db.collection("comments").deleteMany({ postId: { $in: postIds } }),
    db.collection("posts").deleteMany({ communityId }), db.collection("community_members").deleteMany({ communityId }),
    db.collection("communities").deleteOne({ _id: communityId }),
  ]);
  return c.json({ data: { ok: true } });
});

async function postViews(db: Db, posts: any[], userId: ObjectId, canModerate = false): Promise<PostView[]> {
  if (!posts.length) return [];
  const authorIds = [...new Set(posts.map((post) => post.authorId.toHexString()))].map((id) => new ObjectId(id));
  const [authors, votes] = await Promise.all([
    db.collection<UserDoc>("users").find({ _id: { $in: authorIds } }).toArray(),
    db.collection("votes").find({ postId: { $in: posts.map((post) => post._id) }, userId }).toArray(),
  ]);
  const authorMap = new Map(authors.map((author) => [author._id.toHexString(), authorView(author)]));
  const voteMap = new Map(votes.map((vote) => [vote.postId.toHexString(), vote.value]));
  return posts.flatMap((post) => {
    const author = authorMap.get(post.authorId.toHexString());
    if (!author) return [];
    return [{
      id: post._id.toHexString(), body: post.body, author, score: post.score || 0,
      myVote: (voteMap.get(post._id.toHexString()) || 0) as -1 | 0 | 1, commentCount: post.commentCount || 0,
      createdAt: post.createdAt.toISOString(), canDelete: post.authorId.equals(userId) || canModerate,
    }];
  });
}

socialRoutes.get("/communities/:id/posts", async (c) => {
  const communityId = new ObjectId(idSchema.parse(c.req.param("id")));
  const db = c.get("db");
  const [posts, member] = await Promise.all([
    db.collection("posts").find({ communityId }).sort({ createdAt: -1 }).limit(100).toArray(),
    db.collection("community_members").findOne({ communityId, userId: c.get("user")._id }),
  ]);
  return c.json({ data: await postViews(db, posts, c.get("user")._id, ["owner", "moderator"].includes(member?.role)) });
});

socialRoutes.post("/communities/:id/posts", requireCsrf, async (c) => {
  validateRequestOrigin(c);
  const communityId = new ObjectId(idSchema.parse(c.req.param("id")));
  const db = c.get("db");
  await requireMember(db, communityId, c.get("user")._id);
  const input = postCreateSchema.parse(await c.req.json());
  const result = await db.collection("posts").insertOne({ communityId, authorId: c.get("user")._id, body: input.body, score: 0, commentCount: 0, createdAt: new Date(), updatedAt: new Date() });
  const post = await db.collection("posts").findOne({ _id: result.insertedId });
  return c.json({ data: (await postViews(db, [post], c.get("user")._id))[0] }, 201);
});

socialRoutes.post("/posts/:id/vote", requireCsrf, async (c) => {
  validateRequestOrigin(c);
  const postId = new ObjectId(idSchema.parse(c.req.param("id")));
  const input = voteSchema.parse(await c.req.json());
  const db = c.get("db");
  const post = await db.collection("posts").findOne({ _id: postId });
  if (!post) throw new AppError(404, "POST_NOT_FOUND", "Post not found.");
  await requireMember(db, post.communityId, c.get("user")._id);
  const previous = await db.collection("votes").findOne({ postId, userId: c.get("user")._id });
  if (input.value === 0) await db.collection("votes").deleteOne({ postId, userId: c.get("user")._id });
  else await db.collection("votes").updateOne({ postId, userId: c.get("user")._id }, { $set: { value: input.value, updatedAt: new Date() }, $setOnInsert: { createdAt: new Date() } }, { upsert: true });
  const delta = input.value - (previous?.value || 0);
  const updated = await db.collection("posts").findOneAndUpdate({ _id: postId }, { $inc: { score: delta } }, { returnDocument: "after" });
  return c.json({ data: { score: updated?.score || 0, myVote: input.value } });
});

socialRoutes.get("/posts/:id/comments", async (c) => {
  const postId = new ObjectId(idSchema.parse(c.req.param("id")));
  const db = c.get("db");
  const comments = await db.collection("comments").find({ postId }).sort({ createdAt: 1 }).limit(200).toArray();
  const authorIds = [...new Set(comments.map((comment) => comment.authorId.toHexString()))].map((id) => new ObjectId(id));
  const authors = await db.collection<UserDoc>("users").find({ _id: { $in: authorIds } }).toArray();
  const authorMap = new Map(authors.map((author) => [author._id.toHexString(), authorView(author)]));
  return c.json({ data: comments.flatMap((comment) => {
    const author = authorMap.get(comment.authorId.toHexString());
    return author ? [{ id: comment._id.toHexString(), body: comment.body, author, createdAt: comment.createdAt.toISOString(), canDelete: comment.authorId.equals(c.get("user")._id) }] : [];
  }) });
});

socialRoutes.post("/posts/:id/comments", requireCsrf, async (c) => {
  validateRequestOrigin(c);
  const postId = new ObjectId(idSchema.parse(c.req.param("id")));
  const db = c.get("db");
  const post = await db.collection("posts").findOne({ _id: postId });
  if (!post) throw new AppError(404, "POST_NOT_FOUND", "Post not found.");
  await requireMember(db, post.communityId, c.get("user")._id);
  const input = commentCreateSchema.parse(await c.req.json());
  const now = new Date();
  const result = await db.collection("comments").insertOne({ postId, authorId: c.get("user")._id, body: input.body, createdAt: now });
  await db.collection("posts").updateOne({ _id: postId }, { $inc: { commentCount: 1 } });
  return c.json({ data: { id: result.insertedId.toHexString(), body: input.body, author: authorView(c.get("user")), createdAt: now.toISOString(), canDelete: true } }, 201);
});

socialRoutes.delete("/comments/:id", requireCsrf, async (c) => {
  validateRequestOrigin(c);
  const commentId = new ObjectId(idSchema.parse(c.req.param("id")));
  const db = c.get("db");
  const comment = await db.collection("comments").findOne({ _id: commentId });
  if (!comment) throw new AppError(404, "COMMENT_NOT_FOUND", "Comment not found.");
  const post = await db.collection("posts").findOne({ _id: comment.postId });
  const member = post ? await db.collection("community_members").findOne({ communityId: post.communityId, userId: c.get("user")._id }) : null;
  if (!comment.authorId.equals(c.get("user")._id) && !["owner", "moderator"].includes(member?.role)) throw new AppError(403, "FORBIDDEN", "You cannot delete this comment.");
  await db.collection("comments").deleteOne({ _id: commentId });
  await db.collection("posts").updateOne({ _id: comment.postId, commentCount: { $gt: 0 } }, { $inc: { commentCount: -1 } });
  return c.json({ data: { ok: true } });
});

socialRoutes.delete("/posts/:id", requireCsrf, async (c) => {
  validateRequestOrigin(c);
  const postId = new ObjectId(idSchema.parse(c.req.param("id")));
  const db = c.get("db");
  const post = await db.collection("posts").findOne({ _id: postId });
  if (!post) throw new AppError(404, "POST_NOT_FOUND", "Post not found.");
  const member = await db.collection("community_members").findOne({ communityId: post.communityId, userId: c.get("user")._id });
  if (!post.authorId.equals(c.get("user")._id) && !["owner", "moderator"].includes(member?.role)) throw new AppError(403, "FORBIDDEN", "You cannot delete this post.");
  await Promise.all([db.collection("votes").deleteMany({ postId }), db.collection("comments").deleteMany({ postId }), db.collection("posts").deleteOne({ _id: postId })]);
  return c.json({ data: { ok: true } });
});
