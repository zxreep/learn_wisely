/**
 * Wisely API — Cloudflare Worker.
 * Auth (PBKDF2 + opaque sessions), workspace sync (last-write-wins),
 * real communities / room chat / live presence / leaderboard, Groq AI proxy.
 *
 * `buildApp(storage, env)` is environment-agnostic so the whole API can be
 * exercised in Node tests with MemoryStorage; worker/index.ts wires MongoDB.
 */
import { Hono } from 'hono'
import type { Context, Next } from 'hono'
import {
  AI_MODEL_DEFAULT,
  MAX_MESSAGE_LEN,
  MAX_NOTE_UPLOAD_BYTES,
  PRESENCE_TTL_MS,
  type AiGenerateRequest,
  type ApiUser,
  type AuthResponse,
  type WorkspacePull,
} from '../shared/api'
import { hashPassword, randomToken, sha256Hex, verifyPassword } from './crypto'
import { ensureSeeded } from './seed'
import type { Storage, UserRecord } from './storage'
import { generateAi } from './ai'

export interface AppEnv {
  GROQ_API_KEY?: string
  GROQ_MODEL?: string
  AI_RATE_PER_HOUR?: string
}

const DAY = 86_400_000
const SESSION_TTL = 30 * DAY

/* ----------------------------- rate limiting ----------------------------- */
type Bucket = { count: number; resetAt: number }
const buckets = new Map<string, Bucket>()

/** Simple per-isolate token window — degraded gracefully across isolates. */
function rateLimit(key: string, limit: number, windowMs: number): boolean {
  const now = Date.now()
  const b = buckets.get(key)
  if (!b || b.resetAt < now) {
    buckets.set(key, { count: 1, resetAt: now + windowMs })
    return true
  }
  if (b.count >= limit) return false
  b.count += 1
  return true
}

function ip(c: Context): string {
  return c.req.header('cf-connecting-ip') || c.req.header('x-forwarded-for')?.split(',')[0] || 'unknown'
}

/* -------------------------------- helpers -------------------------------- */
const toApiUser = (u: UserRecord): ApiUser => ({
  id: u.id,
  name: u.name,
  color: u.color,
  bio: u.bio,
  joinedAt: u.joinedAt,
})

const NAME_RE = /^[\p{L}\p{N} _-]{2,30}$/u

function weekDayKeys(now = Date.now()): Set<string> {
  const keys = new Set<string>()
  for (let i = 0; i < 7; i++) {
    const d = new Date(now - i * DAY)
    const m = `${d.getUTCMonth() + 1}`.padStart(2, '0')
    const day = `${d.getUTCDate()}`.padStart(2, '0')
    keys.add(`${d.getUTCFullYear()}-${m}-${day}`)
  }
  return keys
}

/* --------------------------- auth middleware ----------------------------- */
declare module 'hono' {
  interface ContextVariableMap {
    user: UserRecord
  }
}

export function buildApp(storage: Storage, env: AppEnv) {
  const app = new Hono()

  app.onError((err, c) => {
    console.error('[api] error', c.req.path, err)
    return c.json({ error: 'internal', message: 'Something went wrong. Try again.' }, 500)
  })

  // platform content on cold start (idempotent)
  app.use('*', async (_c, next) => {
    await ensureSeeded(storage).catch(() => { })
    await next()
  })

  const auth = async (c: Context, next: Next) => {
    const header = c.req.header('authorization') ?? ''
    const token = header.startsWith('Bearer ') ? header.slice(7) : ''
    if (!token) return c.json({ error: 'unauthorized', message: 'Sign in to do that.' }, 401)
    const session = await storage.getSession(await sha256Hex(token))
    if (!session) return c.json({ error: 'unauthorized', message: 'Session expired — sign in again.' }, 401)
    const user = await storage.getUser(session.userId)
    if (!user) return c.json({ error: 'unauthorized', message: 'Account not found.' }, 401)
    c.set('user', user)
    await next()
  }

  async function issueSession(user: UserRecord): Promise<string> {
    const token = randomToken()
    await storage.createSession({
      tokenHash: await sha256Hex(token),
      userId: user.id,
      createdAt: Date.now(),
      expiresAt: Date.now() + SESSION_TTL,
    })
    return token
  }

  /* ------------------------------- health -------------------------------- */
  app.get('/api/healthz', (c) =>
    c.json({ ok: true, ai: !!env.GROQ_API_KEY, model: env.GROQ_MODEL || AI_MODEL_DEFAULT }),
  )

  /* -------------------------------- auth --------------------------------- */
  app.post('/api/auth/signup', async (c) => {
    const body = (await c.req.json().catch(() => ({}))) as { name?: string; password?: string; color?: string }
    const name = (body.name ?? '').trim()
    const password = body.password ?? ''
    if (!NAME_RE.test(name)) return c.json({ error: 'bad_name', message: 'Pick a name of 2–30 letters, numbers, spaces, _ or -.' }, 400)
    if (password.length < 4) return c.json({ error: 'bad_password', message: 'Password needs at least 4 characters.' }, 400)
    if (!rateLimit(`signup:${ip(c)}`, 10, 60_000)) return c.json({ error: 'rate_limited', message: 'Too many attempts — wait a minute.' }, 429)

    const nameLower = name.toLowerCase()
    const clash = await storage.findUserByNameLower(nameLower)
    if (clash) return c.json({ error: 'name_taken', message: 'That name is already taken.' }, 409)

    const { hash, salt, iterations } = await hashPassword(password)
    const user: UserRecord = {
      id: `user_${randomToken().slice(0, 24)}`,
      name,
      nameLower,
      color: body.color && /^#[0-9a-fA-F]{6}$/.test(body.color) ? body.color : '#5b4b8a',
      passwordHash: hash,
      salt,
      iterations,
      joinedAt: Date.now(),
    }
    await storage.createUser(user)
    const token = await issueSession(user)
    const res: AuthResponse = { user: toApiUser(user), token }
    return c.json(res, 201)
  })

  app.post('/api/auth/login', async (c) => {
    const body = (await c.req.json().catch(() => ({}))) as { name?: string; password?: string }
    if (!rateLimit(`login:${ip(c)}`, 10, 60_000)) return c.json({ error: 'rate_limited', message: 'Too many attempts — wait a minute.' }, 429)
    const nameLower = (body.name ?? '').trim().toLowerCase()
    const user = await storage.findUserByNameLower(nameLower)
    const ok =
      !!user &&
      (await verifyPassword(body.password ?? '', { hash: user.passwordHash, salt: user.salt, iterations: user.iterations }))
    if (!ok || !user) return c.json({ error: 'bad_credentials', message: 'Wrong name or password.' }, 401)
    const token = await issueSession(user)
    const res: AuthResponse = { user: toApiUser(user), token }
    return c.json(res)
  })

  app.get('/api/auth/me', auth, (c) => c.json({ user: toApiUser(c.get('user')) }))

  app.post('/api/auth/logout', auth, async (c) => {
    const header = c.req.header('authorization')!
    await storage.deleteSession(await sha256Hex(header.slice(7)))
    return c.json({ ok: true })
  })

  app.patch('/api/me', auth, async (c) => {
    const user = c.get('user')!
    const body = (await c.req.json().catch(() => ({}))) as { name?: string; color?: string; bio?: string }
    const patch: Partial<Pick<UserRecord, 'name' | 'color' | 'bio'>> = {}
    if (body.name !== undefined) {
      const name = body.name.trim()
      if (!NAME_RE.test(name)) return c.json({ error: 'bad_name', message: 'Pick a name of 2–30 letters, numbers, spaces, _ or -.' }, 400)
      if (name.toLowerCase() !== user.nameLower) {
        const clash = await storage.findUserByNameLower(name.toLowerCase())
        if (clash && clash.id !== user.id) return c.json({ error: 'name_taken', message: 'That name is already taken.' }, 409)
      }
      patch.name = name
    }
    if (body.color !== undefined) {
      if (!/^#[0-9a-fA-F]{6}$/.test(body.color)) return c.json({ error: 'bad_color', message: 'Color must be a hex value like #5b4b8a.' }, 400)
      patch.color = body.color
    }
    if (body.bio !== undefined) patch.bio = body.bio.slice(0, 280)
    await storage.updateUser(user.id, patch)
    const updated = await storage.getUser(user.id)
    return c.json({ user: toApiUser(updated!) })
  })

  /* ------------------------------ workspace ------------------------------ */
  app.get('/api/workspace', auth, async (c) => {
    const ws = await storage.getWorkspace(c.get('user')!.id)
    const pull: WorkspacePull = ws
      ? { updatedAt: ws.updatedAt, deviceId: ws.deviceId, deviceName: ws.deviceName, data: ws.data }
      : null
    return c.json({ workspace: pull })
  })

  app.put('/api/workspace', auth, async (c) => {
    const raw = await c.req.text().catch(() => '')
    if (raw.length > MAX_NOTE_UPLOAD_BYTES * 10)
      return c.json({ error: 'too_large', message: 'Workspace snapshot too large.' }, 413)
    const body = JSON.parse(raw || '{}') as { updatedAt?: number; deviceId?: string; deviceName?: string; data?: unknown }
    if (!body.updatedAt || !body.deviceId || typeof body.data !== 'object' || !body.data) {
      return c.json({ error: 'bad_payload', message: 'Missing workspace fields.' }, 400)
    }
    const userId = c.get('user')!.id
    const existing = await storage.getWorkspace(userId)
    // last-write-wins guard: never let an older snapshot clobber a newer one
    if (existing && existing.updatedAt > body.updatedAt) {
      return c.json({
        ok: true,
        applied: false,
        currentUpdatedAt: existing.updatedAt,
        currentDeviceName: existing.deviceName,
      })
    }
    await storage.putWorkspace({
      userId,
      updatedAt: body.updatedAt,
      deviceId: body.deviceId,
      deviceName: (body.deviceName ?? '').slice(0, 60) || undefined,
      data: body.data as Record<string, unknown>,
    })
    return c.json({ ok: true, applied: true, currentUpdatedAt: body.updatedAt })
  })

  /* ----------------------------- communities ----------------------------- */
  app.get('/api/communities', async (c) => {
    const user = await optionalUser(c, storage)
    return c.json({ communities: await storage.listCommunities(user?.id) })
  })

  app.post('/api/communities/:id/join', auth, async (c) => {
    const user = c.get('user')!
    const community = await storage.getCommunity(c.req.param('id') ?? '')
    if (!community) return c.json({ error: 'not_found', message: 'Community not found.' }, 404)
    const memberCount = await storage.setMembership(user.id, community.id, true, user.name, user.color)
    await storage.addFeedEntry(community.id, { userId: user.id, who: user.name, what: 'joined the community', at: Date.now() })
    return c.json({ ok: true, memberCount })
  })

  app.post('/api/communities/:id/leave', auth, async (c) => {
    const user = c.get('user')!
    const community = await storage.getCommunity(c.req.param('id') ?? '')
    if (!community) return c.json({ error: 'not_found', message: 'Community not found.' }, 404)
    const memberCount = await storage.setMembership(user.id, community.id, false, user.name, user.color)
    return c.json({ ok: true, memberCount })
  })

  /* -------------------------------- rooms -------------------------------- */
  app.get('/api/rooms', async (c) => {
    const user = await optionalUser(c, storage)
    return c.json({ rooms: await storage.listRooms(user?.id) })
  })

  app.get('/api/rooms/:id/messages', async (c) => {
    const roomId = c.req.param('id') ?? ''
    if (!(await storage.getRoom(roomId))) return c.json({ error: 'not_found' }, 404)
    const after = Number(c.req.query('after') ?? 0) || 0
    const limit = Math.min(Number(c.req.query('limit') ?? 100) || 100, 200)
    return c.json({ messages: await storage.getMessages(roomId, after, limit) })
  })

  app.post('/api/rooms/:id/messages', auth, async (c) => {
    const roomId = c.req.param('id') ?? ''
    if (!(await storage.getRoom(roomId))) return c.json({ error: 'not_found' }, 404)
    if (!rateLimit(`msg:${c.get('user')!.id}`, 30, 60_000))
      return c.json({ error: 'rate_limited', message: 'Slow down a little — max 30 messages per minute.' }, 429)
    const body = (await c.req.json().catch(() => ({}))) as { text?: string }
    const text = (body.text ?? '').trim().slice(0, MAX_MESSAGE_LEN)
    if (!text) return c.json({ error: 'empty', message: 'Write something first.' }, 400)
    const user = c.get('user')!
    const msg = {
      id: `msg_${randomToken().slice(0, 20)}`,
      roomId,
      userId: user.id,
      who: user.name,
      color: user.color,
      text,
      at: Date.now(),
    }
    await storage.addMessage(msg)
    return c.json({ message: msg }, 201)
  })

  app.post('/api/rooms/:id/presence', auth, async (c) => {
    const roomId = c.req.param('id') ?? ''
    if (!(await storage.getRoom(roomId))) return c.json({ error: 'not_found' }, 404)
    if (!rateLimit(`hb:${c.get('user')!.id}`, 30, 60_000)) return c.json({ ok: true, throttled: true })
    const body = (await c.req.json().catch(() => ({}))) as { subject?: string; focusing?: boolean; label?: string }
    const user = c.get('user')!
    const existing = (await storage.getPresence(roomId, Date.now(), PRESENCE_TTL_MS)).find((p) => p.userId === user.id)
    await storage.heartbeat({
      roomId,
      userId: user.id,
      who: user.name,
      color: user.color,
      subject: (body.subject ?? '').slice(0, 60),
      focusing: !!body.focusing,
      label: (body.label ?? '').slice(0, 40) || undefined,
      since: existing && existing.focusing && body.focusing ? existing.since : body.focusing ? Date.now() : Date.now(),
      at: Date.now(),
    })
    return c.json({ ok: true })
  })

  app.delete('/api/rooms/:id/presence', auth, async (c) => {
    await storage.clearPresence(c.req.param('id') ?? '', c.get('user')!.id)
    return c.json({ ok: true })
  })

  app.get('/api/rooms/:id/presence', async (c) => {
    const roomId = c.req.param('id') ?? ''
    if (!(await storage.getRoom(roomId))) return c.json({ error: 'not_found' }, 404)
    const list = await storage.getPresence(roomId, Date.now(), PRESENCE_TTL_MS)
    return c.json({
      presence: list.map(({ roomId: _r, ...rest }) => rest),
    })
  })

  /* ----------------------------- leaderboard ----------------------------- */
  app.get('/api/leaderboard', async (c) => {
    const rows = await storage.listLeaderboard(weekDayKeys())
    return c.json({ leaderboard: rows })
  })

  /* --------------------------------- AI ---------------------------------- */
  app.post('/api/ai/generate', async (c) => {
    if (!env.GROQ_API_KEY) {
      return c.json({ error: 'ai_unavailable', message: 'AI service is not configured on the server.' }, 503)
    }
    const perHour = Number(env.AI_RATE_PER_HOUR ?? 30) || 30
    if (!rateLimit(`ai:${ip(c)}`, perHour, 3_600_000)) {
      return c.json({ error: 'rate_limited', message: `AI limit reached (${perHour}/hour) — try the on-device mode or wait.` }, 429)
    }
    const raw = await c.req.text().catch(() => '')
    if (raw.length > MAX_NOTE_UPLOAD_BYTES) return c.json({ error: 'too_large', message: 'Content too large.' }, 413)
    const req = JSON.parse(raw || '{}') as AiGenerateRequest
    if (!['summarize', 'flashcards', 'quiz', 'explain', 'ask'].includes(req.mode)) {
      return c.json({ error: 'bad_mode' }, 400)
    }
    try {
      const out = await generateAi({ GROQ_API_KEY: env.GROQ_API_KEY, GROQ_MODEL: env.GROQ_MODEL }, req)
      return c.json(out)
    } catch (err) {
      console.error('[ai]', err)
      return c.json({ error: 'ai_error', message: 'AI generation failed — the on-device engine will take over.' }, 502)
    }
  })

  return app
}

async function optionalUser(c: Context, storage: Storage): Promise<UserRecord | null> {
  const header = c.req.header('authorization') ?? ''
  const token = header.startsWith('Bearer ') ? header.slice(7) : ''
  if (!token) return null
  const session = await storage.getSession(await sha256Hex(token))
  if (!session) return null
  return storage.getUser(session.userId)
}
