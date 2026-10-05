import { create } from 'zustand'
import { persist } from 'zustand/middleware'
import type { FocusPhase, FocusSession, FocusSettings } from '../lib/types'
import { uid } from '../lib/utils'
import { playChime } from '../lib/audio'
import { useProgress } from './progress'
import { useSync } from './sync'
import { toast } from './toast'

export const FOCUS_MODES = [
  { id: 'pomodoro', label: 'Pomodoro', desc: '25 min work · 5 min break' },
  { id: 'deep', label: 'Deep work', desc: '90 min · phone in another room' },
  { id: 'sprint', label: 'Quick sprint', desc: '15 min · warm-up or review' },
  { id: 'custom', label: 'Custom', desc: 'Set your own timer' },
] as const

const MODE_MIN: Record<string, number> = { pomodoro: 25, deep: 90, sprint: 15 }

export interface FocusTimer {
  mode: string
  customMin: number
  phase: FocusPhase
  cycle: number
  label: string
  running: boolean
  secondsLeft: number
  endAt: number | null
  workedSec: number
}

export const workDurationMin = (t: Pick<FocusTimer, 'mode' | 'customMin'>) =>
  t.mode === 'custom' ? t.customMin : MODE_MIN[t.mode] ?? 25

export const phaseDurationSec = (t: FocusTimer, s: FocusSettings, phase: FocusPhase) =>
  (phase === 'work' ? workDurationMin(t) : phase === 'short' ? s.shortMin : s.longMin) * 60

const defaultTimer = (): FocusTimer => ({
  mode: 'pomodoro',
  customMin: 45,
  phase: 'work',
  cycle: 1,
  label: '',
  running: false,
  secondsLeft: MODE_MIN.pomodoro * 60,
  endAt: null,
  workedSec: 0,
})

interface FocusState {
  settings: FocusSettings
  sessions: FocusSession[]
  activeRoomId: string | null
  timer: FocusTimer

  updateSettings: (patch: Partial<FocusSettings>) => void
  setActiveRoom: (id: string | null) => void
  logSession: (minutes: number, label: string, mode: string) => void
  clearHistory: () => void

  // store-backed timer (survives navigation, reloads and throttled tabs)
  setMode: (mode: string) => void
  setCustomMin: (min: number) => void
  setLabel: (label: string) => void
  startTimer: () => void
  pauseTimer: () => void
  endTimer: () => void
  tick: () => void
}

export const useFocus = create<FocusState>()(
  persist(
    (set, get) => ({
      settings: { workMin: 25, shortMin: 5, longMin: 15, cycles: 4, autoBreaks: true },
      sessions: [],
      activeRoomId: null,
      timer: defaultTimer(),

      updateSettings: (patch) => {
        set((s) => ({ settings: { ...s.settings, ...patch } }))
        useSync.getState().markDirty()
      },
      setActiveRoom: (id) => set({ activeRoomId: id }),

      logSession: (minutes, label, mode) => {
        if (minutes < 1) return
        const rounded = Math.round(minutes)
        const session: FocusSession = {
          id: uid('ses'),
          startedAt: Date.now() - rounded * 60000,
          minutes: rounded,
          label,
          mode,
          roomId: get().activeRoomId ?? undefined,
        }
        set((s) => ({ sessions: [session, ...s.sessions].slice(0, 200) }))
        const hour = new Date(session.startedAt).getHours()
        const p = useProgress.getState()
        p.track('focus-minutes', rounded, { sessionLenMin: rounded, hour, label: `${rounded} min of focus` })
        p.track('sessions', 1, { label: 'Focus session complete' })
        useSync.getState().markDirty()
      },

      clearHistory: () => set({ sessions: [] }),

      setMode: (mode) => {
        const t = get().timer
        const fresh: FocusTimer = { ...defaultTimer(), mode, customMin: t.customMin, label: t.label, secondsLeft: (mode === 'custom' ? t.customMin : MODE_MIN[mode]) * 60 }
        set({ timer: fresh })
      },
      setCustomMin: (customMin) => {
        set((s) => {
          const t = s.timer
          const next = { ...t, customMin }
          if (t.mode === 'custom' && !t.running && t.phase === 'work') next.secondsLeft = customMin * 60
          return { timer: next }
        })
      },
      setLabel: (label) => set((s) => ({ timer: { ...s.timer, label } })),

      startTimer: () => {
        set((s) => ({
          timer: { ...s.timer, running: true, endAt: Date.now() + s.timer.secondsLeft * 1000 },
        }))
      },
      pauseTimer: () => {
        set((s) => ({ timer: { ...s.timer, running: false, endAt: null } }))
      },

      endTimer: () => {
        const t = get().timer
        // log partial progress when ending a work block early (>= 1 min)
        if (t.phase === 'work' && t.workedSec >= 60) {
          get().logSession(t.workedSec / 60, t.label || 'Untitled focus', modeLabel(t.mode))
        }
        set((s) => ({ timer: { ...defaultTimer(), mode: t.mode, customMin: t.customMin, label: t.label, secondsLeft: phaseDurationSec(t, s.settings, 'work') } }))
      },

      tick: () => {
        const s = get()
        const t = s.timer
        if (!t.running || !t.endAt) return
        const left = Math.max(0, Math.ceil((t.endAt - Date.now()) / 1000))
        if (left <= 0) {
          completePhase(set, get)
          return
        }
        if (left !== t.secondsLeft) {
          const workedGap = t.phase === 'work' ? Math.max(0, t.secondsLeft - left) : 0
          set({ timer: { ...t, secondsLeft: left, workedSec: t.workedSec + workedGap } })
        }
      },
    }),
    {
      name: 'wisely-focus',
      version: 2,
      partialize: (s) => ({ settings: s.settings, sessions: s.sessions, activeRoomId: s.activeRoomId, timer: s.timer }),
      migrate: (state) => {
        const old = state as Partial<FocusState>
        return {
          settings: old.settings ?? { workMin: 25, shortMin: 5, longMin: 15, cycles: 4, autoBreaks: true },
          sessions: old.sessions ?? [],
          activeRoomId: old.activeRoomId ?? null,
          timer: defaultTimer(),
        }
      },
      onRehydrateStorage: () => (state) => {
        // a running timer whose deadline passed while the app was closed is reset to idle
        if (state?.timer?.running && state.timer.endAt && state.timer.endAt < Date.now()) {
          useFocus.setState((s) => ({
            timer: { ...defaultTimer(), mode: s.timer.mode, customMin: s.timer.customMin, label: s.timer.label, secondsLeft: phaseDurationSec(s.timer, s.settings, 'work') },
          }))
        }
      },
    },
  ),
)

type Set = (partial: Partial<FocusState> | ((s: FocusState) => Partial<FocusState>)) => void
type Get = () => FocusState

function modeLabel(mode: string): string {
  return FOCUS_MODES.find((m) => m.id === mode)?.label ?? mode
}

function completePhase(set: Set, get: Get) {
  const s = get()
  const t = s.timer
  if (t.phase === 'work') {
    get().logSession(workDurationMin(t), t.label || 'Untitled focus', modeLabel(t.mode))
    playChime('work')
    const workSec = workDurationMin(t) * 60
    if (t.mode === 'pomodoro' && s.settings.autoBreaks) {
      const isLong = t.cycle >= s.settings.cycles
      const next: FocusPhase = isLong ? 'long' : 'short'
      const dur = (next === 'long' ? s.settings.longMin : s.settings.shortMin) * 60
      toast.success('Focus block complete', `${workDurationMin(t)} minutes logged. Enjoy your ${next === 'long' ? 'long ' : ''}break.`)
      set({
        timer: {
          ...t, phase: next, secondsLeft: dur, endAt: Date.now() + dur * 1000, workedSec: 0,
          cycle: isLong ? 1 : t.cycle + 1,
        },
      })
      return
    }
    toast.success('Focus block complete', `${workDurationMin(t)} minutes logged. Take a breath — start another block when ready.`)
    set({ timer: { ...t, phase: 'work', running: false, endAt: null, secondsLeft: workSec, workedSec: 0 } })
    return
  }
  // break finished
  playChime('break')
  toast.info('Break over', 'Back to it when you are.')
  const workSec = phaseDurationSec(t, s.settings, 'work')
  const restart = s.settings.autoBreaks && t.mode === 'pomodoro'
  set({
    timer: {
      ...t, phase: 'work', secondsLeft: workSec, workedSec: 0,
      running: restart, endAt: restart ? Date.now() + workSec * 1000 : null,
    },
  })
}
