/**
 * Storage contract the API is built against. Two implementations exist:
 *
 *  - `MongoStorage` (worker/mongo.ts) — production, MongoDB Atlas M0.
 *  - `MemoryStorage` (here) — uses mongodb-style filters in plain JS; used by
 *    the Node integration tests and as a readable reference implementation.
 *
 * Keeping the surface small and explicit means the Mongo driver swap is
 * confined to one file.
 */
import type { ApiCommunity, ApiMessage, ApiPresence, ApiRoom, FeedEntry, LeaderboardRow } from '../shared/api'

/* -------------------------------- records ------------------------------- */
export interface UserRecord {
  id: string
  name: string
  nameLower: string
  color: string
  bio?: string
  passwordHash: string
  salt: string
  iterations: number
  joinedAt: number
}

export interface SessionRecord {
  tokenHash: string
  userId: string
  createdAt: number
  expiresAt: number
}

export interface WorkspaceRecord {
  userId: string
  updatedAt: number
  deviceId: string
  deviceName?: string
  data: Record<string, unknown>
}

export interface CommunityRecord {
  id: string
  name: string
  description: string
  category: string
  color: string
  icon: string
  verified?: boolean
  createdAt: number
}

export interface MembershipRecord {
  userId: string
  communityId: string
  who: string
  color: string
  joinedAt: number
}

export interface RoomRecord {
  id: string
  name: string
  vibe: string
  color: string
  createdAt: number
}

export interface MessageRecord extends ApiMessage { }

export interface PresenceRecord extends ApiPresence {
  roomId: string
}

/* ------------------------------- interface ------------------------------ */
export interface Storage {
  // users / sessions
  createUser(u: UserRecord): Promise<void>
  findUserByNameLower(nameLower: string): Promise<UserRecord | null>
  getUser(id: string): Promise<UserRecord | null>
  updateUser(id: string, patch: Partial<Pick<UserRecord, 'name' | 'color' | 'bio'>>): Promise<void>
  createSession(s: SessionRecord): Promise<void>
  getSession(tokenHash: string): Promise<SessionRecord | null>
  deleteSession(tokenHash: string): Promise<void>

  // workspace
  getWorkspace(userId: string): Promise<WorkspaceRecord | null>
  putWorkspace(rec: WorkspaceRecord): Promise<void>
  listLeaderboard(weekKeys: Set<string>): Promise<LeaderboardRow[]>

  // communities
  listCommunities(userId?: string): Promise<ApiCommunity[]>
  upsertCommunity(c: CommunityRecord): Promise<void>
  getCommunity(id: string): Promise<CommunityRecord | null>
  setMembership(userId: string, communityId: string, joined: boolean, who: string, color: string): Promise<number>
  addFeedEntry(communityId: string, entry: FeedEntry): Promise<void>

  // rooms
  listRooms(userId?: string): Promise<ApiRoom[]>
  upsertRoom(r: RoomRecord): Promise<void>
  getRoom(id: string): Promise<RoomRecord | null>
  addMessage(m: MessageRecord): Promise<void>
  getMessages(roomId: string, after?: number, limit?: number): Promise<ApiMessage[]>
  heartbeat(p: PresenceRecord): Promise<void>
  clearPresence(roomId: string, userId: string): Promise<void>
  getPresence(roomId: string, now: number, ttlMs: number): Promise<PresenceRecord[]>

  // room membership preference is stored client-side via presence;
  // `joined` is derived from fresh presence server-side.
}

/* --------------------------- memory implementation ----------------------- */
export class MemoryStorage implements Storage {
  users = new Map<string, UserRecord>()
  sessions = new Map<string, SessionRecord>()
  workspaces = new Map<string, WorkspaceRecord>()
  communities = new Map<string, CommunityRecord>()
  memberships = new Map<string, MembershipRecord>() // key `${userId}:${communityId}`
  feeds = new Map<string, FeedEntry[]>()
  rooms = new Map<string, RoomRecord>()
  messages = new Map<string, ApiMessage[]>() // by roomId
  presence = new Map<string, PresenceRecord>() // key `${roomId}:${userId}`
  msgSeq = 0

  async createUser(u: UserRecord) {
    this.users.set(u.id, u)
  }
  async findUserByNameLower(nameLower: string) {
    for (const u of this.users.values()) if (u.nameLower === nameLower) return u
    return null
  }
  async getUser(id: string) {
    return this.users.get(id) ?? null
  }
  async updateUser(id: string, patch: Partial<Pick<UserRecord, 'name' | 'color' | 'bio'>>) {
    const u = this.users.get(id)
    if (!u) return
    const next = { ...u, ...patch }
    if (patch.name) next.nameLower = patch.name.toLowerCase()
    this.users.set(id, next)
  }
  async createSession(s: SessionRecord) {
    this.sessions.set(s.tokenHash, s)
  }
  async getSession(tokenHash: string) {
    const s = this.sessions.get(tokenHash)
    if (!s) return null
    if (s.expiresAt < Date.now()) {
      this.sessions.delete(tokenHash)
      return null
    }
    return s
  }
  async deleteSession(tokenHash: string) {
    this.sessions.delete(tokenHash)
  }

  async getWorkspace(userId: string) {
    return this.workspaces.get(userId) ?? null
  }
  async putWorkspace(rec: WorkspaceRecord) {
    this.workspaces.set(rec.userId, rec)
  }

  async listLeaderboard(weekKeys: Set<string>): Promise<LeaderboardRow[]> {
    const rows: LeaderboardRow[] = []
    for (const ws of this.workspaces.values()) {
      const u = this.users.get(ws.userId)
      if (!u) continue
      const progress = ws.data?.progress as { activity?: Record<string, { xp?: number }>; streak?: { current?: number } } | undefined
      let weeklyXp = 0
      if (progress?.activity) {
        for (const [k, v] of Object.entries(progress.activity)) {
          if (weekKeys.has(k)) weeklyXp += v?.xp ?? 0
        }
      }
      rows.push({ userId: u.id, name: u.name, color: u.color, weeklyXp, streak: progress?.streak?.current ?? 0 })
    }
    return rows.sort((a, b) => b.weeklyXp - a.weeklyXp).slice(0, 25)
  }

  async listCommunities(userId?: string): Promise<ApiCommunity[]> {
    const out: ApiCommunity[] = []
    for (const c of this.communities.values()) {
      const members = [...this.memberships.values()].filter((m) => m.communityId === c.id)
      out.push({
        id: c.id, name: c.name, description: c.description, category: c.category,
        color: c.color, icon: c.icon, verified: c.verified,
        memberCount: members.length,
        joined: !!userId && this.memberships.has(`${userId}:${c.id}`),
        activity: (this.feeds.get(c.id) ?? []).slice(-4).reverse(),
      })
    }
    return out.sort((a, b) => b.memberCount - a.memberCount)
  }
  async upsertCommunity(c: CommunityRecord) {
    this.communities.set(c.id, c)
  }
  async getCommunity(id: string) {
    return this.communities.get(id) ?? null
  }
  async setMembership(userId: string, communityId: string, joined: boolean, who: string, color: string): Promise<number> {
    const key = `${userId}:${communityId}`
    if (joined && !this.memberships.has(key)) {
      this.memberships.set(key, { userId, communityId, who, color, joinedAt: Date.now() })
    } else if (!joined) {
      this.memberships.delete(key)
    }
    return [...this.memberships.values()].filter((m) => m.communityId === communityId).length
  }
  async addFeedEntry(communityId: string, entry: FeedEntry) {
    const list = this.feeds.get(communityId) ?? []
    list.push(entry)
    this.feeds.set(communityId, list.slice(-15))
  }

  async listRooms(userId?: string): Promise<ApiRoom[]> {
    const now = Date.now()
    const fresh = [...this.presence.values()].filter((p) => now - p.at < 120_000)
    return [...this.rooms.values()].map((r) => {
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
    this.rooms.set(r.id, r)
  }
  async getRoom(id: string) {
    return this.rooms.get(id) ?? null
  }
  async addMessage(m: ApiMessage) {
    const list = this.messages.get(m.roomId) ?? []
    list.push(m)
    // cap per-room history server-side
    this.messages.set(m.roomId, list.slice(-400))
  }
  async getMessages(roomId: string, after = 0, limit = 100): Promise<ApiMessage[]> {
    const list = (this.messages.get(roomId) ?? []).filter((m) => m.at > after)
    return list.slice(-limit)
  }
  async heartbeat(p: PresenceRecord) {
    this.presence.set(`${p.roomId}:${p.userId}`, p)
  }
  async clearPresence(roomId: string, userId: string) {
    this.presence.delete(`${roomId}:${userId}`)
  }
  async getPresence(roomId: string, now: number, ttlMs: number): Promise<PresenceRecord[]> {
    return [...this.presence.values()]
      .filter((p) => p.roomId === roomId && now - p.at < ttlMs)
      .sort((a, b) => Number(b.focusing) - Number(a.focusing) || a.since - b.since)
  }
}
