import { create } from 'zustand'
import { persist } from 'zustand/middleware'
import { toast } from './toast'
import { api, ApiError } from '../lib/api'
import { collectWorkspace, applyWorkspace, localUpdatedAt } from '../lib/workspaceData'
import { useSettings } from './settings'
import { useAuth, isAuthed } from './auth'

/**
 * Cloud sync engine v2 — real, opaque-snapshot based.
 *
 * Local is always writable (local-first). When signed in and online, edits
 * land in a pending queue and a debounced push ships the whole workspace to
 * the Worker, which applies last-write-wins by `updatedAt`. Pulls run after
 * pushes, on sign-in, every 60s, and manually; a newer server copy is
 * applied over local stores with a toast. When signed out the engine idles
 * in "local" mode — nothing is attempted, nothing is simulated.
 */
interface SyncState {
  online: boolean
  pending: number
  status: 'local' | 'offline' | 'pending' | 'syncing' | 'synced' | 'conflict'
  lastSyncedAt: number | null
  lastAppliedAt: number // server snapshot timestamp we've seen/applied
  deviceName: string

  setOnline: (v: boolean) => void
  markDirty: (n?: number) => void
  syncNow: () => Promise<void>
  afterSignIn: () => Promise<void>
  detach: () => void
  setDeviceName: (n: string) => void
}

let pushTimer: ReturnType<typeof setTimeout> | null = null
let pullTimer: ReturnType<typeof setInterval> | null = null
let running = false

export const useSync = create<SyncState>()(
  persist(
    (set, get) => ({
      online: typeof navigator === 'undefined' ? true : navigator.onLine,
      pending: 0,
      status: 'local',
      lastSyncedAt: null,
      lastAppliedAt: 0,
      deviceName: 'This browser',

      setOnline: (v) => {
        const wasOffline = !get().online
        set({ online: v, status: v ? (get().pending > 0 ? 'pending' : statusFor(get)) : 'offline' })
        if (v && wasOffline && isAuthed()) {
          const n = get().pending
          if (n > 0) toast.info('Back online', `Syncing ${n} change${n === 1 ? '' : 's'}…`)
          void get().syncNow()
        }
      },

      markDirty: (n = 1) => {
        set((s) => ({ pending: s.pending + n, status: isAuthed() ? 'pending' : 'local' }))
        if (!get().online || !isAuthed()) return
        if (pushTimer) clearTimeout(pushTimer)
        pushTimer = setTimeout(() => void push(set, get), 2200)
      },

      syncNow: async () => {
        await push(set, get)
        await pull(set, get)
      },

      afterSignIn: async () => {
        // unify: push local world up; if the account already has newer data,
        // the push is rejected and we pull instead (never double-apply).
        await push(set, get)
        await pull(set, get)
        startPullTimer(set, get)
      },

      detach: () => {
        if (pullTimer) clearInterval(pullTimer)
        pullTimer = null
        if (pushTimer) clearTimeout(pushTimer)
        pushTimer = null
        set({ status: 'local' })
      },

      setDeviceName: (deviceName) => set({ deviceName }),
    }),
    {
      name: 'wisely-sync',
      version: 2,
      migrate: (p: any) => ({
        pending: p?.pending ?? 0,
        lastSyncedAt: p?.lastSyncedAt ?? null,
        lastAppliedAt: 0,
        deviceName: p?.deviceName ?? 'This browser',
      }),
      partialize: (s) => ({
        pending: s.pending,
        lastSyncedAt: s.lastSyncedAt,
        lastAppliedAt: s.lastAppliedAt,
        deviceName: s.deviceName,
      }),
    },
  ),
)

type Set = (partial: Partial<SyncState> | ((s: SyncState) => Partial<SyncState>)) => void
type Get = () => SyncState

function statusFor(get: Get): SyncState['status'] {
  if (!isAuthed()) return 'local'
  if (!get().online) return 'offline'
  return get().lastSyncedAt ? 'synced' : 'local'
}

async function push(set: Set, get: Get) {
  const s = get()
  if (!s.online || !isAuthed() || running) return
  running = true
  set({ status: 'syncing' })
  try {
    const data = await collectWorkspace()
    const updatedAt = await localUpdatedAt()
    const res = await api.pushWorkspace({
      updatedAt,
      deviceId: useSettings.getState().deviceId,
      deviceName: get().deviceName,
      data,
    })
    if (res.applied) {
      set({ pending: 0, lastSyncedAt: Date.now(), lastAppliedAt: res.currentUpdatedAt, status: 'synced' })
    } else {
      // server has a newer copy — pull it over local (LWW)
      set({ status: 'conflict', lastAppliedAt: res.currentUpdatedAt })
      const from = res.currentDeviceName ? ` from ${res.currentDeviceName}` : ''
      toast.info('Newer copy in the cloud', `A device${from} synced after this one — pulling its changes.`)
    }
  } catch (err) {
    if (err instanceof ApiError && err.isAuth) await useAuth.getState().refreshMe()
    set({ status: get().online ? 'pending' : 'offline' })
  } finally {
    running = false
  }
}

async function pull(set: Set, get: Get) {
  if (!get().online || !isAuthed()) return
  try {
    const { workspace } = await api.pullWorkspace()
    if (!workspace) return
    if (workspace.updatedAt > get().lastAppliedAt) {
      const applied = await applyWorkspace(workspace.data)
      if (applied) {
        set({ lastAppliedAt: workspace.updatedAt, pending: 0, lastSyncedAt: Date.now(), status: 'synced' })
        if (get().status !== 'conflict') {
          // only chat about it when this pull brought genuinely newer data than our push did
          toast.info('Synced from cloud', `Latest changes from ${workspace.deviceName ?? 'another device'} are here.`)
        }
      }
    } else {
      set((s) => (s.status === 'syncing' ? { status: 'synced', lastSyncedAt: Date.now() } : {}))
    }
  } catch (err) {
    if (err instanceof ApiError && err.isAuth) await useAuth.getState().refreshMe()
    set({ status: get().online ? (get().pending > 0 ? 'pending' : statusFor(get)) : 'offline' })
  }
}

function startPullTimer(set: Set, get: Get) {
  if (pullTimer) return
  pullTimer = setInterval(() => {
    if (isAuthed() && get().online && document.visibilityState === 'visible') void pull(set, get)
  }, 60_000)
}

/** boot strap: rehydrate → if a token exists, resume periodic pulls */
export function bootstrapSync() {
  const s = useSync.getState()
  const { online } = s
  window.addEventListener('online', () => s.setOnline(true))
  window.addEventListener('offline', () => s.setOnline(false))
  document.addEventListener('visibilitychange', () => {
    if (document.visibilityState === 'visible' && isAuthed()) void s.syncNow()
  })
  s.setOnline(navigator.onLine)
  if (isAuthed() && online) {
    void s.afterSignIn()
  }
}
