import { create } from 'zustand'
import { persist } from 'zustand/middleware'
import { toast } from './toast'

/**
 * Simulated sync engine.
 *
 * Wisely is local-first: every write lands in localStorage instantly.
 * The sync store keeps a queue ("pending changes") that drains whenever the
 * device is online — offline edits accumulate and flush on reconnect, which
 * is exactly how the multi-device sync will behave once a backend exists.
 */
interface SyncState {
  online: boolean
  pending: number
  syncing: boolean
  lastSyncedAt: number | null
  deviceName: string
  setOnline: (v: boolean) => void
  markDirty: (n?: number) => void
  syncNow: () => Promise<void>
}

let syncTimer: ReturnType<typeof setTimeout> | null = null

export const useSync = create<SyncState>()(
  persist(
    (set, get) => ({
      online: typeof navigator === 'undefined' ? true : navigator.onLine,
      pending: 0,
      syncing: false,
      lastSyncedAt: Date.now(),
      deviceName: 'This browser',

      setOnline: (v) => {
        const wasOffline = !get().online
        set({ online: v })
        if (v && wasOffline) {
          const n = get().pending
          if (n > 0) {
            toast.info('Back online', `Syncing ${n} pending change${n === 1 ? '' : 's'}…`)
            void get().syncNow()
          }
        }
      },

      markDirty: (n = 1) => {
        set((s) => ({ pending: s.pending + n }))
        // debounce auto-sync when online
        if (get().online) {
          if (syncTimer) clearTimeout(syncTimer)
          syncTimer = setTimeout(() => void get().syncNow(), 1400)
        }
      },

      syncNow: async () => {
        const { online, syncing, pending } = get()
        if (!online || syncing) return
        if (pending === 0) {
          set({ lastSyncedAt: Date.now() })
          return
        }
        set({ syncing: true })
        await new Promise((r) => setTimeout(r, 700 + Math.random() * 700))
        set({ syncing: false, pending: 0, lastSyncedAt: Date.now() })
      },
    }),
    {
      name: 'wisely-sync',
      version: 1,
      partialize: (s) => ({ pending: s.pending, lastSyncedAt: s.lastSyncedAt, deviceName: s.deviceName }),
    },
  ),
)
