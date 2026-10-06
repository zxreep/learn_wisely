import { create } from 'zustand'
import { persist } from 'zustand/middleware'
import type { ApiUser } from '../../shared/api'
import { api, setAuthToken } from '../lib/api'
import { toast } from './toast'

/**
 * Real account layer. A signed-in user gets:
 *  - cloud workspace sync (push/pull with LWW conflict guard)
 *  - community join/leave, room chat and live presence
 *  - a seat on the public XP leaderboard
 * Guests keep the full local-first app; cloud features prompt sign-in.
 */
interface AuthState {
  user: ApiUser | null
  token: string | null
  busy: boolean
  error: string | null

  login: (name: string, password: string) => Promise<boolean>
  signup: (name: string, password: string, color?: string) => Promise<boolean>
  logout: () => void
  refreshMe: () => Promise<void>
  updateProfile: (patch: { name?: string; color?: string; bio?: string }) => Promise<void>
  clearError: () => void
}

export const useAuth = create<AuthState>()(
  persist(
    (set, get) => ({
      user: null,
      token: null,
      busy: false,
      error: null,

      login: async (name, password) => {
        set({ busy: true, error: null })
        try {
          const { user, token } = await api.login(name, password)
          setAuthToken(token)
          set({ user, token, busy: false })
          void afterAuth('Welcome back', `Signed in as ${user.name}.`)
          return true
        } catch (err) {
          set({ busy: false, error: err instanceof Error ? err.message : 'Sign in failed' })
          return false
        }
      },

      signup: async (name, password, color) => {
        set({ busy: true, error: null })
        try {
          const { user, token } = await api.signup(name, password, color)
          setAuthToken(token)
          set({ user, token, busy: false })
          void afterAuth('Account created', `Welcome to Wisely, ${user.name}. Your work syncs now.`)
          return true
        } catch (err) {
          set({ busy: false, error: err instanceof Error ? err.message : 'Sign up failed' })
          return false
        }
      },

      logout: () => {
        const token = get().token
        set({ user: null, token: null })
        setAuthToken(null)
        if (token) void api.logout().catch(() => { })
        toast.info('Signed out', 'Everything stays on this device. Sign back in anytime.')
        // stop pushing to cloud
        void import('./sync').then((m) => m.useSync.getState().detach())
      },

      refreshMe: async () => {
        if (!get().token) return
        try {
          const { user } = await api.me()
          set({ user })
        } catch (err) {
          if ((err as { isAuth?: boolean })?.isAuth) {
            set({ user: null, token: null })
            setAuthToken(null)
            toast.warn('Session expired', 'Sign in again to keep syncing.')
            void import('./sync').then((m) => m.useSync.getState().detach())
          }
        }
      },

      updateProfile: async (patch) => {
        try {
          const { user } = await api.updateProfile(patch)
          set({ user })
          toast.success('Profile updated', 'Your name and color show up in rooms and leaderboards.')
        } catch (err) {
          toast.warn('Not saved', err instanceof Error ? err.message : 'Could not update profile')
          throw err
        }
      },

      clearError: () => set({ error: null }),
    }),
    {
      name: 'wisely-auth',
      version: 1,
      partialize: (s) => ({ user: s.user, token: s.token }),
      onRehydrateStorage: () => (state) => {
        if (state?.token) setAuthToken(state.token)
      },
    },
  ),
)

export const isAuthed = () => !!useAuth.getState().token

async function afterAuth(title: string, desc: string) {
  toast.success(title, desc)
  const sync = await import('./sync')
  await sync.useSync.getState().afterSignIn()
}
