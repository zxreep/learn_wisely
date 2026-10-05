import { create } from 'zustand'

export type AiMode = 'ask' | 'summarize' | 'flashcards' | 'quiz' | 'explain'

interface AiContext {
  open: boolean
  mode: AiMode
  noteId?: string
  deckId?: string
}

interface UiState {
  paletteOpen: boolean
  sidebarOpen: boolean
  ai: AiContext
  authPrompt: { open: boolean; hint?: string }
  setPaletteOpen: (v: boolean) => void
  setSidebarOpen: (v: boolean) => void
  openAi: (mode: AiMode, ctx?: { noteId?: string; deckId?: string }) => void
  closeAi: () => void
  openAuth: (hint?: string) => void
  closeAuth: () => void
}

export const useUi = create<UiState>()((set) => ({
  paletteOpen: false,
  sidebarOpen: false,
  ai: { open: false, mode: 'ask' },
  authPrompt: { open: false },
  setPaletteOpen: (paletteOpen) => set({ paletteOpen }),
  setSidebarOpen: (sidebarOpen) => set({ sidebarOpen }),
  openAi: (mode, ctx = {}) => set({ ai: { open: true, mode, ...ctx } }),
  closeAi: () => set((s) => ({ ai: { ...s.ai, open: false } })),
  openAuth: (hint) => set({ authPrompt: { open: true, hint } }),
  closeAuth: () => set({ authPrompt: { open: false } }),
}))
