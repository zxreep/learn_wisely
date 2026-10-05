/**
 * Platform content: the six public communities and four co-working rooms.
 * Seeded into the database idempotently on first request when the collections
 * are empty — these are real, server-owned records (not client fakes), and
 * every member shown on them afterwards is a real signed-up user.
 */
import type { Storage } from './storage'

export const SEED_COMMUNITIES = [
  {
    id: 'c_bio',
    name: 'BioBuilders',
    description: 'Figure-first biology: systems, pathways, and spaced recall sprints together.',
    category: 'Sciences',
    color: '#2f7a57',
    icon: 'leaf',
    verified: true,
  },
  {
    id: 'c_math',
    name: 'Math Circle',
    description: 'Proof club meets problem sets. Calculus, linear algebra, and competition drills.',
    category: 'Sciences',
    color: '#1f3f7a',
    icon: 'sigma',
    verified: true,
  },
  {
    id: 'c_premed',
    name: 'Pre-med Commons',
    description: 'Anatomy, pharmacology and long MCAT arcs — one steady session at a time.',
    category: 'Sciences',
    color: '#8f3b2f',
    icon: 'flask',
  },
  {
    id: 'c_cs',
    name: 'Code & Coffee',
    description: 'Deep work sprints on CS fundamentals: data structures, systems, and theory.',
    category: 'Engineering',
    color: '#5b4b8a',
    icon: 'code',
  },
  {
    id: 'c_lang',
    name: 'Language Exchange',
    description: 'Daily vocab streaks, shadowing practice, and grammar teardowns in any language.',
    category: 'Arts & Languages',
    color: '#b0851f',
    icon: 'message',
  },
  {
    id: 'c_econ',
    name: 'Econ & Finance Study Group',
    description: 'Micro to macro, markets to models. Weekly problem sets and idea reviews.',
    category: 'Humanities',
    color: '#4a8fa3',
    icon: 'trend',
  },
]

export const SEED_ROOMS = [
  { id: 'r_focus', name: 'Deep Focus Den', vibe: 'Silent sprint — cameras off, notes open, zero chatter.', color: '#1f6f4a' },
  { id: 'r_exam', name: 'Exam Crunch HQ', vibe: 'Exam-week empathy. Timers sync until the storm passes.', color: '#8f3b2f' },
  { id: 'r_chill', name: 'Chill Beats Lounge', vibe: 'Lo-fi ambient review: flashcards, sketches, soft check-ins.', color: '#b0851f' },
  { id: 'r_late', name: 'Midnight Library', vibe: 'Candle-light co-working for night owls and thesis grinders.', color: '#5b4b8a' },
]

let seeding: Promise<void> | null = null

/**
 * Idempotent, single-flight seeding — safe under concurrent requests on a
 * cold isolate: everyone awaits the same in-flight seeding promise, so no
 * reader can observe a half-seeded (empty) database.
 */
export async function ensureSeeded(storage: Storage): Promise<void> {
  seeding ??= doSeed(storage).catch((err) => {
    seeding = null // allow retry on the next request
    throw err
  })
  await seeding
}

async function doSeed(storage: Storage): Promise<void> {
  const now = Date.now()
  const existing = await storage.listCommunities()
  if (existing.length === 0) {
    for (const c of SEED_COMMUNITIES) await storage.upsertCommunity({ ...c, createdAt: now })
  }
  const rooms = await storage.listRooms()
  if (rooms.length === 0) {
    for (const r of SEED_ROOMS) await storage.upsertRoom({ ...r, createdAt: now })
  }
}
