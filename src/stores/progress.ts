import { create } from 'zustand'
import { persist } from 'zustand/middleware'
import type { DayLog, Metric, Quest, Streak, XpEvent } from '../lib/types'
import { uid } from '../lib/utils'
import { todayKey, weekKey, yesterdayKey, lastNDays } from '../lib/dates'
import { seedActivity } from '../lib/seed'
import { useSync } from './sync'
import { toast } from './toast'

/* ------------------------------- levels --------------------------------- */
export const xpForLevel = (level: number) => 120 * (level - 1) ** 2
export const levelFromXp = (xp: number) => Math.floor(Math.sqrt(Math.max(0, xp) / 120)) + 1

/* ------------------------------- quests --------------------------------- */
const DAILY_POOL: { title: string; desc: string; metric: Metric; target: number; xp: number }[] = [
  { title: 'Complete a focus session', desc: 'Any length counts.', metric: 'sessions', target: 1, xp: 40 },
  { title: 'Log 45 focus minutes', desc: 'Deep work, not doomscrolling.', metric: 'focus-minutes', target: 45, xp: 60 },
  { title: 'Review 20 flashcards', desc: 'Spaced repetition pays rent.', metric: 'cards-reviewed', target: 20, xp: 50 },
  { title: 'Capture a new note', desc: 'Anything you learned today.', metric: 'notes-created', target: 1, xp: 30 },
  { title: 'Finish 2 board tasks', desc: 'Drag them all the way to done.', metric: 'tasks-completed', target: 2, xp: 40 },
  { title: 'Add something from Discover', desc: 'A deck, a board or a note pack.', metric: 'content-added', target: 1, xp: 35 },
]

const WEEKLY_POOL: typeof DAILY_POOL = [
  { title: '300 focus minutes this week', desc: 'About an hour a day.', metric: 'focus-minutes', target: 300, xp: 200 },
  { title: '150 cards reviewed this week', desc: 'Keep the forgetting curve honest.', metric: 'cards-reviewed', target: 150, xp: 200 },
]

function seededPick<T>(arr: T[], n: number, salt: string): T[] {
  let h = 0
  for (const c of salt) h = (h * 31 + c.charCodeAt(0)) >>> 0
  const idx: number[] = []
  while (idx.length < Math.min(n, arr.length)) {
    h = (h * 1103515245 + 12345) >>> 0
    const i = h % arr.length
    if (!idx.includes(i)) idx.push(i)
  }
  return idx.map((i) => arr[i])
}

function questsForNow(): Quest[] {
  const day = todayKey()
  const week = weekKey()
  return [
    ...seededPick(DAILY_POOL, 3, day).map((q, i) => ({
      id: `dq-${day}-${i}`, kind: 'daily' as const, periodKey: day, progress: 0, done: false, ...q,
    })),
    ...WEEKLY_POOL.map((q, i) => ({
      id: `wq-${week}-${i}`, kind: 'weekly' as const, periodKey: week, progress: 0, done: false, ...q,
    })),
  ]
}

/* ------------------------------- badges --------------------------------- */
export interface BadgeDef {
  id: string
  name: string
  desc: string
  icon: string // key into icon map
  check: (s: BadgeSnapshot) => boolean
}

export interface BadgeSnapshot {
  counters: Record<Metric, number>
  streak: Streak
  xp: number
  longestSessionMin: number
  nightSession: boolean
  morningSession: boolean
}

export const BADGES: BadgeDef[] = [
  { id: 'first-steps', name: 'First Steps', desc: 'Complete your first focus session', icon: 'footprints', check: (s) => s.counters.sessions >= 1 },
  { id: 'getting-serious', name: 'Getting Serious', desc: 'Complete 10 focus sessions', icon: 'target', check: (s) => s.counters.sessions >= 10 },
  { id: 'deep-diver', name: 'Deep Diver', desc: 'One session of 60+ minutes', icon: 'waves', check: (s) => s.longestSessionMin >= 60 },
  { id: 'night-owl', name: 'Night Owl', desc: 'Focus after 10pm', icon: 'moon', check: (s) => s.nightSession },
  { id: 'early-bird', name: 'Early Bird', desc: 'Focus before 8am', icon: 'sunrise', check: (s) => s.morningSession },
  { id: 'bookworm', name: 'Bookworm', desc: 'Capture 10 notes', icon: 'book', check: (s) => s.counters['notes-created'] >= 10 },
  { id: 'cartographer', name: 'Cartographer', desc: 'Create 3 study boards', icon: 'map', check: () => false /* patched below by boards count */ },
  { id: 'card-shark', name: 'Card Shark', desc: 'Review 100 flashcards', icon: 'cards', check: (s) => s.counters['cards-reviewed'] >= 100 },
  { id: 'collector', name: 'Collector', desc: 'Add 3 items from Discover', icon: 'compass', check: (s) => s.counters['content-added'] >= 3 },
  { id: 'social-animal', name: 'Social Animal', desc: 'Join a community', icon: 'users', check: (s) => s.counters['communities-joined'] >= 1 },
  { id: 'on-fire', name: 'On Fire', desc: '7-day streak', icon: 'flame', check: (s) => s.streak.current >= 7 },
  { id: 'unstoppable', name: 'Unstoppable', desc: '21-day streak', icon: 'rocket', check: (s) => s.streak.current >= 21 },
  { id: 'scholar', name: 'Scholar', desc: 'Reach level 5', icon: 'cap', check: (s) => levelFromXp(s.xp) >= 5 },
  { id: 'marathoner', name: 'Marathoner', desc: '1,000 lifetime focus minutes', icon: 'timer', check: (s) => s.counters['focus-minutes'] >= 1000 },
]

/* -------------------------------- store --------------------------------- */
interface TrackOpts {
  label?: string
  xp?: number
  sessionLenMin?: number
  hour?: number
  extraBoards?: number
}

interface ProgressState {
  xp: number
  activity: Record<string, DayLog>
  streak: Streak
  quests: Quest[]
  badges: Record<string, number>
  xpEvents: XpEvent[]
  counters: Record<Metric, number>
  longestSessionMin: number
  nightSession: boolean
  morningSession: boolean
  boardCreations: number

  ensureQuests: () => void
  awardXp: (amount: number, label: string) => void
  track: (metric: Metric, amount?: number, opts?: TrackOpts) => void
  weeklyXp: () => number
  reset: () => void
}

const XP_BY_METRIC: Partial<Record<Metric, number>> = {
  'focus-minutes': 2,
  sessions: 20,
  'cards-reviewed': 3,
  'notes-created': 10,
  'tasks-completed': 15,
  'content-added': 10,
  'communities-joined': 25,
}

function buildSeedState() {
  const { log, streak, xp } = seedActivity()
  const counters: Record<Metric, number> = {
    'focus-minutes': 0, sessions: 0, 'cards-reviewed': 0, 'notes-created': 6,
    'tasks-completed': 1, 'content-added': 0, 'communities-joined': 0,
  }
  for (const d of Object.values(log)) {
    counters['focus-minutes'] += d.minutes
    counters.sessions += d.sessions
    counters['cards-reviewed'] += d.cards
  }
  return { xp, activity: log, streak, counters }
}

export const useProgress = create<ProgressState>()(
  persist(
    (set, get) => ({
      ...buildSeedState(),
      quests: [],
      badges: {},
      xpEvents: [],
      longestSessionMin: 0,
      nightSession: false,
      morningSession: false,
      boardCreations: 1,

      ensureQuests: () => {
        const day = todayKey()
        const week = weekKey()
        const existing = get().quests
        if (existing.some((q) => q.periodKey === day) && existing.some((q) => q.periodKey === week)) return
        const fresh = questsForNow()
        // preserve any progress made today (e.g. same day revisit)
        const merged = fresh.map((q) => existing.find((x) => x.id === q.id) ?? q)
        set({ quests: merged })
        checkBadges(set, get)
      },

      awardXp: (amount, label) => {
        if (amount <= 0) return
        const today = todayKey()
        set((s) => {
          const day = s.activity[today] ?? { minutes: 0, xp: 0, cards: 0, sessions: 0 }
          return {
            xp: s.xp + amount,
            activity: { ...s.activity, [today]: { ...day, xp: day.xp + amount } },
            xpEvents: [{ id: uid('xe'), label, xp: amount, at: Date.now() }, ...s.xpEvents].slice(0, 60),
          }
        })
        if (amount >= 10) toast.xp(`+${amount} XP`, label)
        checkBadges(set, get)
      },

      track: (metric, amount = 1, opts = {}) => {
        get().ensureQuests()
        const today = todayKey()
        const xpGain = opts.xp ?? (XP_BY_METRIC[metric] ?? 0) * amount

        set((s) => {
          const day = s.activity[today] ?? { minutes: 0, xp: 0, cards: 0, sessions: 0 }
          const nextDay: DayLog = { ...day, xp: day.xp + xpGain }
          if (metric === 'focus-minutes') nextDay.minutes += amount
          if (metric === 'cards-reviewed') nextDay.cards += amount
          if (metric === 'sessions') nextDay.sessions += 1

          // streak
          const streak = { ...s.streak }
          if (streak.lastActive !== today) {
            streak.current = streak.lastActive === yesterdayKey() ? streak.current + 1 : 1
            streak.longest = Math.max(streak.longest, streak.current)
            streak.lastActive = today
          }

          // quests
          const quests = s.quests.map((q) => {
            if (q.done || q.metric !== metric) return q
            if (q.kind === 'daily' && q.periodKey !== today) return q
            if (q.kind === 'weekly' && q.periodKey !== weekKey()) return q
            const progress = q.progress + amount
            return { ...q, progress, done: progress >= q.target }
          })

          const counters = { ...s.counters, [metric]: s.counters[metric] + amount }

          return {
            activity: { ...s.activity, [today]: nextDay },
            streak,
            quests,
            counters,
            longestSessionMin: Math.max(s.longestSessionMin, opts.sessionLenMin ?? 0),
            nightSession: s.nightSession || (opts.hour !== undefined && opts.hour >= 22),
            morningSession: s.morningSession || (opts.hour !== undefined && opts.hour < 8),
          }
        })

        useSync.getState().markDirty()
        if (xpGain > 0) get().awardXp(xpGain, opts.label ?? defaultLabel(metric, amount))

        // quest-completion toasts + xp (after main set; new state available)
        const toClaim = get().quests.filter((q) => q.done && !q._claimed)
        if (toClaim.length > 0) {
          set((s) => ({
            quests: s.quests.map((q) => (toClaim.some((x) => x.id === q.id) ? { ...q, _claimed: true } : q)),
          }))
          for (const q of toClaim) {
            toast.quest('Quest complete', `“${q.title}” — +${q.xp} XP`)
            get().awardXp(q.xp, `Quest: ${q.title}`)
          }
        }
        checkBadges(set, get)
      },

      weeklyXp: () => {
        const days = lastNDays(7)
        const a = get().activity
        return days.reduce((sum, k) => sum + (a[k]?.xp ?? 0), 0)
      },

      reset: () => {
        set({
          ...buildSeedState(),
          quests: [],
          badges: {},
          xpEvents: [],
          longestSessionMin: 0,
          nightSession: false,
          morningSession: false,
          boardCreations: 0,
        })
      },
    }),
    { name: 'wisely-progress', version: 1 },
  ),
)

type Set = (fn: (s: ProgressState) => Partial<ProgressState>) => void
type Get = () => ProgressState

function checkBadges(set: Set, get: Get) {
  const s = get()
  const snap: BadgeSnapshot = {
    counters: { ...s.counters, 'content-added': s.counters['content-added'] },
    streak: s.streak,
    xp: s.xp,
    longestSessionMin: s.longestSessionMin,
    nightSession: s.nightSession,
    morningSession: s.morningSession,
  }
  const newly: [string, BadgeDef][] = []
  for (const b of BADGES) {
    if (s.badges[b.id]) continue
    const ok = b.id === 'cartographer' ? s.boardCreations >= 3 : b.check(snap)
    if (ok) newly.push([b.id, b])
  }
  if (newly.length === 0) return
  set((st) => ({
    badges: { ...st.badges, ...Object.fromEntries(newly.map(([id]) => [id, Date.now()])) },
  }))
  for (const [, b] of newly) {
    toast.badge(`Badge unlocked — ${b.name}`, b.desc)
    get().awardXp(50, `Badge: ${b.name}`)
  }
}

function defaultLabel(metric: Metric, amount: number): string {
  switch (metric) {
    case 'focus-minutes': return `${amount} min of focus`
    case 'sessions': return 'Focus session complete'
    case 'cards-reviewed': return `Reviewed ${amount} card${amount === 1 ? '' : 's'}`
    case 'notes-created': return 'Created a note'
    case 'tasks-completed': return 'Board task completed'
    case 'content-added': return 'Added from Discover'
    case 'communities-joined': return 'Joined a community'
  }
}

/** internal flag so quest XP is only granted once */
declare module '../lib/types' {
  interface Quest {
    _claimed?: boolean
  }
}
