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
  setPaletteOpen: (v: boolean) => void
  setSidebarOpen: (v: boolean) => void
  openAi: (mode: AiMode, ctx?: { noteId?: string; deckId?: string }) => void
  closeAi: () => void
}

export const useUi = create<UiState>()((set) => ({
  paletteOpen: false,
  sidebarOpen: false,
  ai: { open: false, mode: 'ask' },
  setPaletteOpen: (paletteOpen) => set({ paletteOpen }),
  setSidebarOpen: (sidebarOpen) => set({ sidebarOpen }),
  openAi: (mode, ctx = {}) => set({ ai: { open: true, mode, ...ctx } }),
  closeAi: () => set((s) => ({ ai: { ...s.ai, open: false } })),
}))
