import { create } from 'zustand'
import { persist } from 'zustand/middleware'
import type { Board, BoardCard, BoardColumn } from '../lib/types'
import { uid } from '../lib/utils'
import { seedBoards } from '../lib/seed'
import { useProgress } from './progress'
import { useSync } from './sync'
import type { BoardTemplate } from '../lib/templates'

const dirty = () => useSync.getState().markDirty()

interface BoardsState {
  boards: Board[]
  createBoard: (title: string, opts?: Partial<Board>) => string
  createFromTemplate: (t: BoardTemplate) => string
  updateBoard: (id: string, patch: Partial<Board>) => void
  deleteBoard: (id: string) => void

  addColumn: (boardId: string, title: string) => void
  renameColumn: (boardId: string, columnId: string, title: string) => void
  removeColumn: (boardId: string, columnId: string) => void

  addCard: (boardId: string, columnId: string, title: string) => string
  updateCard: (boardId: string, cardId: string, patch: Partial<BoardCard>) => void
  removeCard: (boardId: string, cardId: string) => void
  moveCard: (boardId: string, cardId: string, toColumnId: string, toIndex: number) => void
  toggleDone: (boardId: string, cardId: string) => void
  replaceAll: (boards: Board[]) => void
}

const touch = (b: Board): Board => ({ ...b, updatedAt: Date.now() })

export const useBoards = create<BoardsState>()(
  persist(
    (set, get) => ({
      boards: seedBoards(),

      createBoard: (title, opts = {}) => {
        const id = uid('brd')
        const col = { id: uid('col'), title: 'To do' }
        const board: Board = {
          id,
          title,
          icon: opts.icon ?? 'board',
          color: opts.color ?? '#3f7d58',
          description: opts.description ?? '',
          columns: opts.columns ?? [col, { id: uid('col'), title: 'Doing' }, { id: uid('col'), title: 'Done' }],
          cards: opts.cards ?? [],
          favorite: opts.favorite ?? false,
          createdAt: Date.now(),
          updatedAt: Date.now(),
          fromDiscover: opts.fromDiscover,
        }
        set((s) => ({ boards: [board, ...s.boards] }))
        useProgress.setState((p) => ({ boardCreations: p.boardCreations + 1 }))
        dirty()
        return id
      },

      createFromTemplate: (t) => {
        const id = uid('brd')
        const columns: BoardColumn[] = t.columns.map((title) => ({ id: uid('col'), title }))
        const cards: BoardCard[] = t.cards.map((c) => ({
          id: uid('bcd'),
          columnId: columns[Math.min(c.col, columns.length - 1)].id,
          title: c.title,
          note: c.note,
          tags: [],
          createdAt: Date.now(),
          done: false,
        }))
        const board: Board = {
          id, title: t.title, icon: t.icon, color: t.color, description: t.description,
          columns, cards, favorite: false, createdAt: Date.now(), updatedAt: Date.now(), fromDiscover: true,
        }
        set((s) => ({ boards: [board, ...s.boards] }))
        useProgress.setState((p) => ({ boardCreations: p.boardCreations + 1 }))
        dirty()
        return id
      },

      updateBoard: (id, patch) => {
        set((s) => ({ boards: s.boards.map((b) => (b.id === id ? touch({ ...b, ...patch }) : b)) }))
        dirty()
      },
      deleteBoard: (id) => {
        set((s) => ({ boards: s.boards.filter((b) => b.id !== id) }))
        dirty()
      },

      addColumn: (boardId, title) => {
        set((s) => ({
          boards: s.boards.map((b) =>
            b.id === boardId ? touch({ ...b, columns: [...b.columns, { id: uid('col'), title }] }) : b,
          ),
        }))
        dirty()
      },
      renameColumn: (boardId, columnId, title) => {
        set((s) => ({
          boards: s.boards.map((b) =>
            b.id === boardId
              ? touch({ ...b, columns: b.columns.map((c) => (c.id === columnId ? { ...c, title } : c)) })
              : b,
          ),
        }))
        dirty()
      },
      removeColumn: (boardId, columnId) => {
        set((s) => ({
          boards: s.boards.map((b) =>
            b.id === boardId
              ? touch({
                  ...b,
                  columns: b.columns.filter((c) => c.id !== columnId),
                  cards: b.cards.filter((c) => c.columnId !== columnId),
                })
              : b,
          ),
        }))
        dirty()
      },

      addCard: (boardId, columnId, title) => {
        const id = uid('bcd')
        set((s) => ({
          boards: s.boards.map((b) =>
            b.id === boardId
              ? touch({
                  ...b,
                  cards: [...b.cards, { id, columnId, title, tags: [], createdAt: Date.now(), done: false }],
                })
              : b,
          ),
        }))
        dirty()
        return id
      },
      updateCard: (boardId, cardId, patch) => {
        set((s) => ({
          boards: s.boards.map((b) =>
            b.id === boardId
              ? touch({ ...b, cards: b.cards.map((c) => (c.id === cardId ? { ...c, ...patch } : c)) })
              : b,
          ),
        }))
        dirty()
      },
      removeCard: (boardId, cardId) => {
        set((s) => ({
          boards: s.boards.map((b) =>
            b.id === boardId ? touch({ ...b, cards: b.cards.filter((c) => c.id !== cardId) }) : b,
          ),
        }))
        dirty()
      },

      moveCard: (boardId, cardId, toColumnId, toIndex) => {
        set((s) => ({
          boards: s.boards.map((b) => {
            if (b.id !== boardId) return b
            const card = b.cards.find((c) => c.id === cardId)
            if (!card) return b
            const moved = { ...card, columnId: toColumnId }
            const without = b.cards.filter((c) => c.id !== cardId)
            // index within the destination column
            const colCards = without.filter((c) => c.columnId === toColumnId)
            const before = colCards[toIndex]
            const insertAt = before ? without.indexOf(before) : without.length
            without.splice(insertAt, 0, moved)
            return touch({ ...b, cards: without })
          }),
        }))
        dirty()
      },

      toggleDone: (boardId, cardId) => {
        const board = get().boards.find((b) => b.id === boardId)
        const card = board?.cards.find((c) => c.id === cardId)
        if (!card) return
        get().updateCard(boardId, cardId, { done: !card.done })
        if (!card.done) {
          useProgress.getState().track('tasks-completed', 1, { label: `Completed “${card.title}”` })
        }
      },

      replaceAll: (boards) => {
        set({ boards })
        dirty()
      },
    }),
    { name: 'wisely-boards', version: 1 },
  ),
)
