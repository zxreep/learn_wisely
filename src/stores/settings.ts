import { create } from 'zustand'
import { persist } from 'zustand/middleware'

export type Theme = 'light' | 'dark' | 'system'

interface SettingsState {
  name: string
  theme: Theme
  dailyGoalMin: number
  onboarded: boolean
  deviceId: string
  setName: (n: string) => void
  setTheme: (t: Theme) => void
  setDailyGoal: (m: number) => void
  setOnboarded: (v: boolean) => void
}

export const useSettings = create<SettingsState>()(
  persist(
    (set) => ({
      name: 'Alex',
      theme: 'system',
      dailyGoalMin: 120,
      onboarded: false,
      deviceId: Math.random().toString(36).slice(2, 8),
      setName: (name) => set({ name }),
      setTheme: (theme) => set({ theme }),
      setDailyGoal: (dailyGoalMin) => set({ dailyGoalMin }),
      setOnboarded: (onboarded) => set({ onboarded }),
    }),
    { name: 'wisely-settings', version: 1 },
  ),
)
