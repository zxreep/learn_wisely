import { create } from 'zustand'
import type { ApiCommunity, ApiMessage, ApiPresence, ApiRoom, LeaderboardRow } from '../../shared/api'
import { api, ApiError } from '../lib/api'
import { isAuthed, useAuth } from './auth'
import { useUi } from './ui'
import { toast } from './toast'

/**
 * Server-backed social layer — every community, member, room, chat line and
 * leaderboard row below comes from MongoDB via the Wisely API. No simulated
 * data anywhere: an empty room is genuinely empty, a member is a real human.
 * Guests can browse (read-only) and are prompted to sign in to participate.
 */

interface RoomCache {
  messages: ApiMessage[]
  presence: ApiPresence[]
  lastMessageAt: number
  loaded: boolean
}

interface CommunityState {
  communities: ApiCommunity[]
  rooms: ApiRoom[]
  leaderboard: LeaderboardRow[]
  loading: { communities: boolean; rooms: boolean; leaderboard: boolean }
  unreachable: boolean
  roomCache: Record<string, RoomCache>

  fetchCommunities: () => Promise<void>
  fetchRooms: () => Promise<void>
  fetchLeaderboard: () => Promise<void>
  joinCommunity: (id: string) => Promise<void>
  leaveCommunity: (id: string) => Promise<void>

  enterRoom: (roomId: string) => Promise<void>
  pollRoom: (roomId: string) => Promise<void>
  sendMessage: (roomId: string, text: string) => Promise<void>
  heartbeat: (roomId: string, p: { subject: string; focusing: boolean }) => Promise<void>
  leaveRoomPresence: (roomId: string) => Promise<void>
}

const emptyCache = (): RoomCache => ({ messages: [], presence: [], lastMessageAt: 0, loaded: false })

async function guard<T>(fn: () => Promise<T>, set: (p: Partial<CommunityState>) => void, opts?: { quiet?: boolean }): Promise<T | null> {
  try {
    const out = await fn()
    set({ unreachable: false })
    return out
  } catch (err) {
    if (err instanceof ApiError && (err.code === 'network_error' || err.status >= 500)) {
      set({ unreachable: true })
      if (!opts?.quiet) toast.warn('Communities unreachable', 'The social server did not respond — your local work is safe.')
    } else if (!opts?.quiet) {
      toast.warn('Request failed', err instanceof Error ? err.message : 'Something went wrong')
    }
    return null
  }
}

function requireAuth(hint: string): boolean {
  if (isAuthed()) return true
  useUi.getState().openAuth(hint)
  return false
}

export const useCommunity = create<CommunityState>()((set, get) => ({
  communities: [],
  rooms: [],
  leaderboard: [],
  loading: { communities: true, rooms: true, leaderboard: true },
  unreachable: false,
  roomCache: {},

  fetchCommunities: async () => {
    const out = await guard(() => api.communities(), set, { quiet: true })
    if (out) set({ communities: out.communities, loading: { ...get().loading, communities: false } })
    else set({ loading: { ...get().loading, communities: false } })
  },

  fetchRooms: async () => {
    const out = await guard(() => api.rooms(), set, { quiet: true })
    if (out) set({ rooms: out.rooms, loading: { ...get().loading, rooms: false } })
    else set({ loading: { ...get().loading, rooms: false } })
  },

  fetchLeaderboard: async () => {
    const out = await guard(() => api.leaderboard(), set, { quiet: true })
    if (out) set({ leaderboard: out.leaderboard, loading: { ...get().loading, leaderboard: false } })
    else set({ loading: { ...get().loading, leaderboard: false } })
  },

  joinCommunity: async (id) => {
    if (!requireAuth('Sign in to join a community.')) return
    const out = await guard(() => api.joinCommunity(id), set)
    if (!out) return
    const c = get().communities.find((x) => x.id === id)
    toast.success(`Joined ${c?.name ?? 'community'}`, 'You now show up as a member.')
    await get().fetchCommunities()
    const progress = await import('./progress')
    progress.useProgress.getState().track('communities-joined', 1, { label: `Joined ${c?.name ?? 'a community'}` })
  },

  leaveCommunity: async (id) => {
    if (!requireAuth('Sign in to manage memberships.')) return
    const c = get().communities.find((x) => x.id === id)
    const out = await guard(() => api.leaveCommunity(id), set)
    if (!out) return
    toast.info(`Left ${c?.name ?? 'community'}`)
    await get().fetchCommunities()
  },

  enterRoom: async (roomId) => {
    const existing = get().roomCache[roomId]
    if (!existing) set({ roomCache: { ...get().roomCache, [roomId]: emptyCache() } })
    const [msgs, pres] = await Promise.all([
      guard(() => api.messages(roomId), set, { quiet: true }),
      guard(() => api.presence(roomId), set, { quiet: true }),
    ])
    const cache = get().roomCache[roomId] ?? emptyCache()
    const messages = msgs ? msgs.messages.slice(-100) : cache.messages
    set({
      roomCache: {
        ...get().roomCache,
        [roomId]: {
          messages,
          presence: pres ? pres.presence : cache.presence,
          lastMessageAt: messages.length ? messages[messages.length - 1].at : cache.lastMessageAt,
          loaded: true,
        },
      },
    })
  },

  pollRoom: async (roomId) => {
    const cache = get().roomCache[roomId] ?? emptyCache()
    const [msgs, pres] = await Promise.all([
      cache.lastMessageAt ? guard(() => api.messages(roomId, cache.lastMessageAt), set, { quiet: true }) : Promise.resolve(null),
      guard(() => api.presence(roomId), set, { quiet: true }),
    ])
    if (!msgs && !pres) return
    const additions = msgs?.messages ?? []
    const merged = [...cache.messages, ...additions].slice(-100)
    set({
      roomCache: {
        ...get().roomCache,
        [roomId]: {
          messages: merged,
          presence: pres ? pres.presence : cache.presence,
          lastMessageAt: merged.length ? merged[merged.length - 1].at : cache.lastMessageAt,
          loaded: true,
        },
      },
    })
  },

  sendMessage: async (roomId, text) => {
    if (!requireAuth('Sign in to chat in study rooms.')) return
    try {
      const { message } = await api.sendMessage(roomId, text)
      const cache = get().roomCache[roomId] ?? emptyCache()
      set({
        roomCache: {
          ...get().roomCache,
          [roomId]: { ...cache, messages: [...cache.messages, message].slice(-100), lastMessageAt: message.at },
        },
      })
    } catch (err) {
      if (err instanceof ApiError && err.isAuth) return void useAuth.getState().refreshMe()
      toast.warn('Message not sent', err instanceof Error ? err.message : 'Try again.')
      throw err
    }
  },

  heartbeat: async (roomId, p) => {
    if (!isAuthed()) return
    await guard(() => api.heartbeat(roomId, p), set, { quiet: true })
  },

  leaveRoomPresence: async (roomId) => {
    if (!isAuthed()) return
    await guard(() => api.leaveRoom(roomId), set, { quiet: true })
  },
}))

/* ------------------------- polling + presence loops ---------------------- */
let roomPollTimer: ReturnType<typeof setInterval> | null = null
let heartbeatTimer: ReturnType<typeof setInterval> | null = null
let heartbeatRoom: string | null = null

/** while a room detail page is open: pull new messages + presence */
export function startRoomPolling(roomId: string) {
  stopRoomPolling()
  roomPollTimer = setInterval(() => void useCommunity.getState().pollRoom(roomId), 4_000)
}

export function stopRoomPolling() {
  if (roomPollTimer) clearInterval(roomPollTimer)
  roomPollTimer = null
}

/**
 * Continuous presence while focusing: the room page calls this so peers see
 * you for the duration of your session (server prunes you after ~90s silence).
 */
export function startHeartbeat(roomId: string, getState: () => { subject: string; focusing: boolean }) {
  stopHeartbeat()
  heartbeatRoom = roomId
  const beat = () => void useCommunity.getState().heartbeat(roomId, getState())
  beat()
  heartbeatTimer = setInterval(beat, 30_000)
}

export function stopHeartbeat() {
  if (heartbeatTimer) clearInterval(heartbeatTimer)
  heartbeatTimer = null
  if (heartbeatRoom) void useCommunity.getState().leaveRoomPresence(heartbeatRoom)
  heartbeatRoom = null
}
