import { create } from 'zustand'
import { persist } from 'zustand/middleware'
import type { Deck, FileItem, Flashcard, Folder, Note, Rating } from '../lib/types'
import { uid } from '../lib/utils'
import { seedLibrary } from '../lib/seed'
import { useProgress } from './progress'
import { useSync } from './sync'

const dirty = () => useSync.getState().markDirty()

/* ------------------------- spaced repetition (SM-2 lite) ---------------- */
export function rateCard(card: Flashcard, rating: Rating): Flashcard {
  const now = Date.now()
  let { interval, ease, reps } = card
  switch (rating) {
    case 'again':
      interval = 0.007 // ~10 minutes
      ease = Math.max(1.3, ease - 0.2)
      reps = 0
      break
    case 'hard':
      interval = Math.max(1, interval * 1.2)
      ease = Math.max(1.3, ease - 0.15)
      reps += 1
      break
    case 'good':
      interval = interval < 1 ? 1 : interval * ease
      reps += 1
      break
    case 'easy':
      interval = Math.max(1, interval * ease * 1.4)
      ease += 0.15
      reps += 1
      break
  }
  return { ...card, interval, ease, reps, due: now + interval * 86400000, lastRating: rating }
}

export const isDue = (c: Flashcard, at = Date.now()) => c.due <= at

interface LibraryState {
  folders: Folder[]
  notes: Note[]
  files: FileItem[]
  decks: Deck[]
  cards: Flashcard[]

  addFolder: (name: string, color?: string) => string
  renameFolder: (id: string, name: string) => void
  deleteFolder: (id: string) => void

  createNote: (partial?: Partial<Note>) => string
  updateNote: (id: string, patch: Partial<Note>) => void
  deleteNote: (id: string) => void

  addFile: (f: Omit<FileItem, 'id' | 'createdAt'>) => void
  deleteFile: (id: string) => void

  createDeck: (title: string, description?: string, color?: string) => string
  updateDeck: (id: string, patch: Partial<Deck>) => void
  deleteDeck: (id: string) => void

  addCards: (deckId: string, cards: { front: string; back: string }[]) => void
  updateCard: (id: string, patch: Partial<Flashcard>) => void
  deleteCard: (id: string) => void
  reviewCard: (id: string, rating: Rating) => void

  replaceAll: (data: Pick<LibraryState, 'folders' | 'notes' | 'files' | 'decks' | 'cards'>) => void
}

export const useLibrary = create<LibraryState>()(
  persist(
    (set, get) => ({
      ...seedLibrary(),

      addFolder: (name, color) => {
        const id = uid('fld')
        set((s) => ({ folders: [...s.folders, { id, name, color }] }))
        dirty()
        return id
      },
      renameFolder: (id, name) => {
        set((s) => ({ folders: s.folders.map((f) => (f.id === id ? { ...f, name } : f)) }))
        dirty()
      },
      deleteFolder: (id) => {
        set((s) => ({
          folders: s.folders.filter((f) => f.id !== id),
          notes: s.notes.map((n) => (n.folderId === id ? { ...n, folderId: null } : n)),
          files: s.files.map((f) => (f.folderId === id ? { ...f, folderId: null } : f)),
        }))
        dirty()
      },

      createNote: (partial = {}) => {
        const id = uid('nte')
        const note: Note = {
          id,
          title: partial.title ?? 'Untitled note',
          content: partial.content ?? '',
          folderId: partial.folderId ?? null,
          tags: partial.tags ?? [],
          color: partial.color,
          favorite: partial.favorite ?? false,
          createdAt: Date.now(),
          updatedAt: Date.now(),
        }
        set((s) => ({ notes: [note, ...s.notes] }))
        useProgress.getState().track('notes-created', 1, { label: `Created “${note.title}”` })
        dirty()
        return id
      },
      updateNote: (id, patch) => {
        set((s) => ({
          notes: s.notes.map((n) => (n.id === id ? { ...n, ...patch, updatedAt: Date.now() } : n)),
        }))
        dirty()
      },
      deleteNote: (id) => {
        set((s) => ({ notes: s.notes.filter((n) => n.id !== id) }))
        dirty()
      },

      addFile: (f) => {
        set((s) => ({ files: [{ ...f, id: uid('fil'), createdAt: Date.now() }, ...s.files] }))
        dirty()
      },
      deleteFile: (id) => {
        set((s) => ({ files: s.files.filter((f) => f.id !== id) }))
        dirty()
      },

      createDeck: (title, description = '', color = '#3f7d58') => {
        const id = uid('dck')
        set((s) => ({ decks: [{ id, title, description, color, favorite: false, createdAt: Date.now() }, ...s.decks] }))
        dirty()
        return id
      },
      updateDeck: (id, patch) => {
        set((s) => ({ decks: s.decks.map((d) => (d.id === id ? { ...d, ...patch } : d)) }))
        dirty()
      },
      deleteDeck: (id) => {
        set((s) => ({ decks: s.decks.filter((d) => d.id !== id), cards: s.cards.filter((c) => c.deckId !== id) }))
        dirty()
      },

      addCards: (deckId, cards) => {
        const fresh: Flashcard[] = cards.map((c) => ({
          id: uid('crd'), deckId, front: c.front, back: c.back,
          interval: 0, ease: 2.5, reps: 0, due: Date.now(),
        }))
        set((s) => ({ cards: [...s.cards, ...fresh] }))
        dirty()
      },
      updateCard: (id, patch) => {
        set((s) => ({ cards: s.cards.map((c) => (c.id === id ? { ...c, ...patch } : c)) }))
        dirty()
      },
      deleteCard: (id) => {
        set((s) => ({ cards: s.cards.filter((c) => c.id !== id) }))
        dirty()
      },
      reviewCard: (id, rating) => {
        set((s) => ({ cards: s.cards.map((c) => (c.id === id ? rateCard(c, rating) : c)) }))
        useProgress.getState().track('cards-reviewed', 1)
        dirty()
      },

      replaceAll: (data) => {
        set(data)
        dirty()
      },
    }),
    { name: 'wisely-library', version: 1 },
  ),
)

/* ------------------------------ selectors ------------------------------- */
export const cardsOfDeck = (cards: Flashcard[], deckId: string) => cards.filter((c) => c.deckId === deckId)
export const dueOfDeck = (cards: Flashcard[], deckId: string, at = Date.now()) =>
  cards.filter((c) => c.deckId === deckId && isDue(c, at)).sort((a, b) => a.due - b.due)
export const allDue = (cards: Flashcard[], at = Date.now()) => cards.filter((c) => isDue(c, at))

/** cards the user "knows" (reps >= 2) for mastery stats */
export const masteryOf = (cards: Flashcard[], deckId: string) => {
  const dc = cardsOfDeck(cards, deckId)
  const known = dc.filter((c) => c.reps >= 2).length
  return dc.length === 0 ? 0 : Math.round((known / dc.length) * 100)
}
