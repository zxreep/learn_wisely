/**
 * Shared API contracts between the Wisely client (src/) and the
 * Cloudflare Worker backend (worker/). Keep this file dependency-free —
 * it is imported by both TypeScript projects.
 */

/* --------------------------------- auth --------------------------------- */
export interface ApiUser {
  id: string
  name: string
  color: string
  bio?: string
  joinedAt: number
}

export interface AuthResponse {
  user: ApiUser
  token: string
}

export interface ApiError {
  error: string
  message?: string
}

/* ------------------------------ workspace sync --------------------------- */
/**
 * The workspace is the user's whole local-first world, mirrored to the
 * server for multi-device sync. Shape lives client-side (`WorkspaceData`
 * in src/lib/workspaceData.ts); the server treats `data` as structured
 * JSON but only needs `updatedAt` for last-write-wins conflict resolution.
 */
export interface WorkspacePush {
  updatedAt: number
  deviceId: string
  deviceName?: string
  data: unknown
}

export type WorkspacePull = {
  updatedAt: number
  deviceId: string
  deviceName?: string
  data: unknown
} | null

export interface WorkspacePushResult {
  ok: boolean
  applied: boolean
  currentUpdatedAt: number
  currentDeviceName?: string
}

/* ------------------------------ communities ------------------------------ */
export interface FeedEntry {
  userId: string
  who: string
  what: string
  at: number
}

export interface ApiCommunity {
  id: string
  name: string
  description: string
  category: string
  color: string
  icon: string
  verified?: boolean
  memberCount: number
  joined: boolean
  activity: FeedEntry[]
}

export interface ApiRoom {
  id: string
  name: string
  vibe: string
  color: string
  online: number
  focusing: number
  joined: boolean
}

export interface ApiMessage {
  id: string
  roomId: string
  userId: string
  who: string
  color: string
  text: string
  at: number
}

export interface ApiPresence {
  userId: string
  who: string
  color: string
  subject: string
  focusing: boolean
  label?: string
  since: number
  at: number
}

export interface LeaderboardRow {
  userId: string
  name: string
  color: string
  weeklyXp: number
  streak: number
}

/* ----------------------------------- AI ---------------------------------- */
export type AiMode = 'summarize' | 'flashcards' | 'quiz' | 'explain' | 'ask'

export interface AiDoc {
  title: string
  content: string
}

export interface AiGenerateRequest {
  mode: AiMode
  /** note context (summarize / flashcards / quiz) */
  note?: AiDoc
  /** deck context (quiz) */
  deckTitle?: string
  cards?: { front: string; back: string }[]
  /** freeform query (ask) or term (explain) */
  query?: string
  /** library snippets the client chose to share for grounding (ask/explain) */
  corpus?: AiDoc[]
}

export interface AiGenerateResponse {
  engine: 'groq'
  model: string
  mode: AiMode
  /** markdown-ish text for summarize / explain / ask */
  text?: string
  /** structured output for flashcards */
  cards?: { front: string; back: string }[]
  /** structured output for quiz */
  questions?: { prompt: string; options: string[]; answer: number }[]
}

/* ------------------------------ misc helpers ----------------------------- */
export const MAX_NOTE_UPLOAD_BYTES = 1_400_000
export const MAX_MESSAGE_LEN = 500
export const PRESENCE_TTL_MS = 90_000
export const AI_MODEL_DEFAULT = 'llama-3.3-70b-versatile'

/** deterministic id used on both sides (worker is ESM, no node:crypto guarantee for older compat) */
export function newId(prefix: string): string {
  const rand = Math.random().toString(36).slice(2, 10)
  return `${prefix}_${rand}${Date.now().toString(36)}`
}
