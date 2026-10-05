import { create } from 'zustand'
import { uid } from '../lib/utils'

export type ToastKind = 'info' | 'success' | 'xp' | 'badge' | 'quest' | 'warn'

export interface Toast {
  id: string
  kind: ToastKind
  title: string
  desc?: string
  icon?: string
  duration?: number
}

interface ToastState {
  toasts: Toast[]
  push: (t: Omit<Toast, 'id'>) => void
  dismiss: (id: string) => void
}

export const useToastStore = create<ToastState>()((set, get) => ({
  toasts: [],
  push: (t) => {
    const id = uid('tst')
    set((s) => ({ toasts: [...s.toasts.slice(-3), { ...t, id }] }))
    const dur = t.duration ?? (t.kind === 'badge' || t.kind === 'quest' ? 5200 : 3200)
    setTimeout(() => get().dismiss(id), dur)
  },
  dismiss: (id) => set((s) => ({ toasts: s.toasts.filter((x) => x.id !== id) })),
}))

export const toast = {
  info: (title: string, desc?: string) => useToastStore.getState().push({ kind: 'info', title, desc }),
  success: (title: string, desc?: string) => useToastStore.getState().push({ kind: 'success', title, desc }),
  xp: (title: string, desc?: string) => useToastStore.getState().push({ kind: 'xp', title, desc }),
  badge: (title: string, desc?: string) => useToastStore.getState().push({ kind: 'badge', title, desc }),
  quest: (title: string, desc?: string) => useToastStore.getState().push({ kind: 'quest', title, desc }),
  warn: (title: string, desc?: string) => useToastStore.getState().push({ kind: 'warn', title, desc }),
}
