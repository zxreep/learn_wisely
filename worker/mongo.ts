/**
 * MongoDB Atlas implementation of the Storage contract.
 *
 * Connects with the official `mongodb` node driver over Cloudflare Workers'
 * outbound TCP/TLS (requires the `nodejs_compat` compatibility flag). Use a
 * standard `mongodb://host1:27017,...` connection string for maximum
 * compatibility; `mongodb+srv://` also works on current wrangler/workerd.
 *
 * One MongoClient is kept per isolate (module scope) and reused across
 * requests — the driver lazily opens its connection pool on first use.
 * Atlas free tier (M0) allows up to 500 connections and needs the network
 * access list to permit Cloudflare's egress IPs (0.0.0.0/0).
 */
import { MongoClient, type Db, type Collection } from 'mongodb'

import type {
  CommunityRecord,
  MembershipRecord,
  MessageRecord,
  PresenceRecord,
  RoomRecord,
  SessionRecord,
  Storage,
  UserRecord,
  WorkspaceRecord,
} from './storage'
import type { ApiCommunity, ApiMessage, ApiRoom, FeedEntry, LeaderboardRow } from '../shared/api'

interface MongoEnv {
  MONGODB_URI: string
  MONGODB_DB?: string
}

let clientPromise: Promise<MongoClient> | null = null

function getDb(env: MongoEnv): Promise<Db> {
  if (!clientPromise) {
    clientPromise = new MongoClient(env.MONGODB_URI, {
      maxPoolSize: 4, // free tier friendly
      serverSelectionTimeoutMS: 6000,
      connectTimeoutMS: 6000,
    } as never).connect()
  }
  return clientPromise.then((c) => c.db(env.MONGODB_DB || 'wisely'))
}

async function ensureIndexes(db: Db) {
  await Promise.all([
    db.collection('users').createIndex({ nameLower: 1 }, { unique: true }),
    db.collection('sessions').createIndex({ expiresAt: 1 }, { expireAfterSeconds: 0 }),
    db.collection('memberships').createIndex({ userId: 1, communityId: 1 }, { unique: true }),
    db.collection('messages').createIndex({ roomId: 1, at: -1 }),
    // presence expires automatically after 5 minutes of silence
    db.collection('presence').createIndex({ at: 1 }, { expireAfterSeconds: 300 }),
  ])
}

let indexesReady = false

export class MongoStorage implements Storage {
  constructor(private env: MongoEnv) { }

  private async db(): Promise<Db> {
    const db = await getDb(this.env)
    if (!indexesReady) {
      indexesReady = true
      ensureIndexes(db).catch(() => {
        indexesReady = false
      })
    }
    return db
  }

  private col(name: string): Promise<Collection<any>> {
    return this.db().then((d) => d.collection(name))
  }

  /* ------------------------------ users ------------------------------ */
  async createUser(u: UserRecord) {
    await (await this.col('users')).insertOne(u as never)
  }
  async findUserByNameLower(nameLower: string): Promise<UserRecord | null> {
    return (await this.col('users')).findOne({ nameLower } as never)
  }
  async getUser(id: string): Promise<UserRecord | null> {
    return (await this.col('users')).findOne({ id } as never)
  }
  async updateUser(id: string, patch: Partial<Pick<UserRecord, 'name' | 'color' | 'bio'>>) {
    const $set: Record<string, string> = { ...patch }
    if (patch.name) $set.nameLower = patch.name.toLowerCase()
    await (await this.col('users')).updateOne({ id } as never, { $set } as never)
  }
  async createSession(s: SessionRecord) {
    await (await this.col('sessions')).insertOne(s as never)
  }
  async getSession(tokenHash: string): Promise<SessionRecord | null> {
    const s = await (await this.col('sessions')).findOne({ tokenHash } as never)
    if (!s) return null
    if (s.expiresAt < Date.now()) return null
    return s
  }
  async deleteSession(tokenHash: string) {
    await (await this.col('sessions')).deleteOne({ tokenHash } as never)
  }

  /* ---------------------------- workspace ---------------------------- */
  async getWorkspace(userId: string): Promise<WorkspaceRecord | null> {
    return (await this.col('workspaces')).findOne({ userId } as never)
  }
  async putWorkspace(rec: WorkspaceRecord) {
    await (await this.col('workspaces')).updateOne(
      { userId: rec.userId } as never,
      { $set: rec } as never,
      { upsert: true },
    )
  }
  async listLeaderboard(weekKeys: Set<string>): Promise<LeaderboardRow[]> {
    const ws = (await this.col('workspaces')).find({} as never, {
      projection: { userId: 1, 'data.progress.activity': 1, 'data.progress.streak.current': 1 } as never,
    })
    const rows: LeaderboardRow[] = []
    for await (const w of ws) {
      const u = await this.getUser(w.userId)
      if (!u) continue
      const progress = w.data?.progress as
        | { activity?: Record<string, { xp?: number }>; streak?: { current?: number } }
        | undefined
      let weeklyXp = 0
      for (const [k, v] of Object.entries(progress?.activity ?? {})) {
        if (weekKeys.has(k)) weeklyXp += (v as { xp?: number })?.xp ?? 0
      }
      rows.push({ userId: u.id, name: u.name, color: u.color, weeklyXp, streak: progress?.streak?.current ?? 0 })
    }
    return rows.sort((a, b) => b.weeklyXp - a.weeklyXp).slice(0, 25)
  }

  /* --------------------------- communities --------------------------- */
  async listCommunities(userId?: string): Promise<ApiCommunity[]> {
    const communities = await (await this.col('communities')).find({} as never).toArray()
    const out: ApiCommunity[] = []
    for (const c of communities) {
      const memberCount = await (await this.col('memberships')).countDocuments({ communityId: c.id } as never)
      const joined = !!userId && !!(await (await this.col('memberships')).findOne({ userId, communityId: c.id } as never))
      const feedDoc = await (await this.col('feeds')).findOne({ id: c.id } as never)
      out.push({
        id: c.id, name: c.name, description: c.description, category: c.category,
        color: c.color, icon: c.icon, verified: c.verified, memberCount, joined,
        activity: (feedDoc?.entries ?? []).slice(-4).reverse(),
      })
    }
    return out.sort((a, b) => b.memberCount - a.memberCount)
  }
  async upsertCommunity(c: CommunityRecord) {
    await (await this.col('communities')).updateOne({ id: c.id } as never, { $setOnInsert: c } as never, { upsert: true })
  }
  async getCommunity(id: string): Promise<CommunityRecord | null> {
    return (await this.col('communities')).findOne({ id } as never)
  }
  async setMembership(userId: string, communityId: string, joined: boolean, who: string, color: string): Promise<number> {
    const col = await this.col('memberships')
    if (joined) {
      await col.updateOne(
        { userId, communityId } as never,
        { $setOnInsert: { userId, communityId, who, color, joinedAt: Date.now() } } as never,
        { upsert: true },
      )
    } else {
      await col.deleteOne({ userId, communityId } as never)
    }
    return col.countDocuments({ communityId } as never)
  }
  async addFeedEntry(communityId: string, entry: FeedEntry) {
    await (await this.col('feeds')).updateOne(
      { id: communityId } as never,
      { $push: { entries: { $each: [entry], $slice: -15 } } } as never,
      { upsert: true },
    )
  }

  /* ----------------------------- rooms ------------------------------- */
  async listRooms(userId?: string): Promise<ApiRoom[]> {
    const rooms = await (await this.col('rooms')).find({} as never).toArray()
    const cutoff = Date.now() - 120_000
    const fresh = await (await this.col('presence')).find({ at: { $gt: cutoff } } as never).toArray()
    return rooms.map((r) => {
      const inRoom = fresh.filter((p) => p.roomId === r.id)
      return {
        id: r.id, name: r.name, vibe: r.vibe, color: r.color,
        online: inRoom.length,
        focusing: inRoom.filter((p) => p.focusing).length,
        joined: !!userId && inRoom.some((p) => p.userId === userId),
      }
    })
  }
  async upsertRoom(r: RoomRecord) {
    await (await this.col('rooms')).updateOne({ id: r.id } as never, { $setOnInsert: r } as never, { upsert: true })
  }
  async getRoom(id: string): Promise<RoomRecord | null> {
    return (await this.col('rooms')).findOne({ id } as never)
  }
  async addMessage(m: MessageRecord) {
    await (await this.col('messages')).insertOne(m as never)
    // trim history opportunistically
    const col = await this.col('messages')
    const count = await col.estimatedDocumentCount()
    if (count > 20_000) {
      const oldest = await col.find({ roomId: m.roomId } as never, { sort: { at: 1 }, limit: 100 } as never).toArray()
      if (oldest.length === 100) {
        await col.deleteMany({ _id: { $in: oldest.map((o: any) => o._id) } } as never)
      }
    }
  }
  async getMessages(roomId: string, after = 0, limit = 100): Promise<ApiMessage[]> {
    const docs = await (await this.col('messages'))
      .find({ roomId, at: { $gt: after } } as never)
      .sort({ at: 1 })
      .limit(limit)
      .toArray()
    return docs.map(({ id, roomId: rid, userId, who, color, text, at }) => ({ id, roomId: rid, userId, who, color, text, at }))
  }
  async heartbeat(p: PresenceRecord) {
    await (await this.col('presence')).updateOne(
      { roomId: p.roomId, userId: p.userId } as never,
      { $set: p } as never,
      { upsert: true },
    )
  }
  async clearPresence(roomId: string, userId: string) {
    await (await this.col('presence')).deleteOne({ roomId, userId } as never)
  }
  async getPresence(roomId: string, now: number, ttlMs: number): Promise<PresenceRecord[]> {
    const docs = await (await this.col('presence'))
      .find({ roomId, at: { $gt: now - ttlMs } } as never)
      .toArray()
    return docs.sort((a, b) => Number(b.focusing) - Number(a.focusing) || a.since - b.since)
  }
}
