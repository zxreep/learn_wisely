import { useEffect, useMemo, useRef, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { AnimatePresence, motion } from 'framer-motion'
import {
  BookOpen, FileText, KanbanSquare, Layers, Moon, NotebookPen, Plus,
  Search, Sparkles, Sun, Timer, Users,
} from 'lucide-react'
import { useUi } from '../stores/ui'
import { useLibrary } from '../stores/library'
import { useBoards } from '../stores/boards'
import { useCommunity } from '../stores/community'
import { useSettings } from '../stores/settings'
import { cn, truncate } from '../lib/utils'

interface Item {
  id: string
  label: string
  hint?: string
  icon: React.ComponentType<{ className?: string }>
  group: string
  run: () => void
}

export function CommandPalette() {
  const { paletteOpen, setPaletteOpen, openAi } = useUi()
  const [q, setQ] = useState('')
  const [idx, setIdx] = useState(0)
  const inputRef = useRef<HTMLInputElement>(null)
  const navigate = useNavigate()
  const { notes, decks, cards } = useLibrary()
  const { boards } = useBoards()
  const { communities } = useCommunity()
  const { theme, setTheme } = useSettings()

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === 'k') {
        e.preventDefault()
        setPaletteOpen(!paletteOpen)
      }
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [paletteOpen, setPaletteOpen])

  useEffect(() => {
    if (paletteOpen) {
      setQ('')
      setIdx(0)
      setTimeout(() => inputRef.current?.focus(), 40)
    }
  }, [paletteOpen])

  const items = useMemo<Item[]>(() => {
    const all: Item[] = [
      { id: 'a-note', label: 'New note', icon: NotebookPen, group: 'Actions', hint: 'Create', run: () => { const id = useLibrary.getState().createNote(); navigate('/library?note=' + id) } },
      { id: 'a-board', label: 'New board', icon: KanbanSquare, group: 'Actions', hint: 'Create', run: () => { const id = useBoards.getState().createBoard('Untitled board'); navigate(`/boards/${id}`) } },
      { id: 'a-deck', label: 'New flashcard deck', icon: Layers, group: 'Actions', hint: 'Create', run: () => { useLibrary.getState().createDeck('New deck'); navigate('/library?tab=decks') } },
      { id: 'a-focus', label: 'Start a focus session', icon: Timer, group: 'Actions', hint: 'Go to Focus mode', run: () => navigate('/focus') },
      { id: 'a-ai', label: 'Ask Wisely', icon: Sparkles, group: 'Actions', hint: 'Groq when online, on-device otherwise', run: () => openAi('ask') },
      { id: 'a-theme', label: theme === 'dark' ? 'Switch to light theme' : 'Switch to dark theme', icon: theme === 'dark' ? Sun : Moon, group: 'Actions', hint: 'Appearance', run: () => setTheme(theme === 'dark' ? 'light' : 'dark') },
      ...notes.map((n) => ({
        id: 'n-' + n.id, label: n.title, hint: 'Note', icon: FileText, group: 'Notes',
        run: () => navigate('/library?note=' + n.id),
      })),
      ...boards.map((b) => ({
        id: 'b-' + b.id, label: b.title, hint: 'Board', icon: KanbanSquare, group: 'Boards',
        run: () => navigate(`/boards/${b.id}`),
      })),
      ...decks.map((d) => ({
        id: 'd-' + d.id, label: d.title, hint: `Deck · ${cards.filter((c) => c.deckId === d.id).length} cards`, icon: Layers, group: 'Decks',
        run: () => navigate('/library?deck=' + d.id),
      })),
      ...communities.map((c) => ({
        id: 'c-' + c.id, label: c.name, hint: 'Community', icon: Users, group: 'Communities',
        run: () => navigate('/community'),
      })),
    ]
    if (!q.trim()) {
      // no query: actions + a handful of recent items
      return all.slice(0, 6).concat(all.filter((i) => i.group === 'Notes').slice(0, 5))
    }
    const needle = q.toLowerCase()
    return all.filter((i) => (i.label + ' ' + (i.hint ?? '')).toLowerCase().includes(needle)).slice(0, 12)
  }, [q, notes, boards, decks, cards, communities, navigate, theme, setTheme, openAi])

  useEffect(() => setIdx(0), [q])

  const run = (item: Item) => {
    setPaletteOpen(false)
    item.run()
  }

  return (
    <AnimatePresence>
      {paletteOpen && (
        <motion.div
          className="fixed inset-0 z-[80] flex items-start justify-center pt-[12vh] px-4"
          initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
        >
          <div className="absolute inset-0 bg-ink/25 backdrop-blur-[2px] dark:bg-black/50" onClick={() => setPaletteOpen(false)} />
          <motion.div
            initial={{ opacity: 0, y: -14, scale: 0.98 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -10, scale: 0.98 }}
            transition={{ type: 'spring', damping: 28, stiffness: 340 }}
            className="relative w-full max-w-xl glass-strong rounded-2xl overflow-hidden"
            role="dialog"
            aria-label="Command palette"
          >
            <div className="flex items-center gap-2.5 px-4 border-b border-line/70">
              <Search className="w-4 h-4 text-ink3 shrink-0" />
              <input
                ref={inputRef}
                value={q}
                onChange={(e) => setQ(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'ArrowDown') { e.preventDefault(); setIdx((i) => Math.min(i + 1, items.length - 1)) }
                  else if (e.key === 'ArrowUp') { e.preventDefault(); setIdx((i) => Math.max(i - 1, 0)) }
                  else if (e.key === 'Enter' && items[idx]) run(items[idx])
                  else if (e.key === 'Escape') setPaletteOpen(false)
                }}
                placeholder="Search everything, or start an action…"
                className="flex-1 h-12 bg-transparent outline-none text-[15px] placeholder:text-ink3"
              />
              <kbd className="text-[10px] font-semibold bg-surface2 border border-line rounded-md px-1.5 py-0.5 text-ink3">esc</kbd>
            </div>
            <div className="max-h-[52vh] overflow-y-auto p-1.5">
              {items.length === 0 && (
                <div className="px-4 py-8 text-center text-sm text-ink3">
                  Nothing matches “{q}”. Try a note title or an action.
                </div>
              )}
              {items.map((item, i) => {
                const showGroup = i === 0 || items[i - 1].group !== item.group
                return (
                  <div key={item.id}>
                    {showGroup && (
                      <div className="px-3 pt-2.5 pb-1 text-[10px] font-semibold uppercase tracking-[0.1em] text-ink3">
                        {item.group}
                      </div>
                    )}
                    <button
                      onMouseEnter={() => setIdx(i)}
                      onClick={() => run(item)}
                      className={cn(
                        'w-full flex items-center gap-3 px-3 h-10 rounded-xl text-left transition-colors',
                        i === idx ? 'bg-accent/10' : '',
                      )}
                    >
                      <span className={cn('grid place-items-center w-7 h-7 rounded-lg shrink-0', i === idx ? 'bg-accent/15 text-accent' : 'bg-surface2 text-ink2')}>
                        <item.icon className="w-3.5 h-3.5" />
                      </span>
                      <span className="text-[13.5px] font-medium truncate">{truncate(item.label, 60)}</span>
                      {item.hint && <span className="ml-auto text-[11px] text-ink3 shrink-0">{item.hint}</span>}
                    </button>
                  </div>
                )
              })}
              {q.trim() !== '' && (
                <button
                  onClick={() => { setPaletteOpen(false); openAi('ask') }}
                  className="w-full flex items-center gap-3 px-3 h-10 rounded-xl text-left hover:bg-accent/10 mt-1 border-t border-line/60"
                >
                  <span className="grid place-items-center w-7 h-7 rounded-lg bg-accent2/15 text-accent2 shrink-0">
                    <Sparkles className="w-3.5 h-3.5" />
                  </span>
                  <span className="text-[13.5px] font-medium">Ask Wisely: “{truncate(q, 40)}”</span>
                  <BookOpen className="w-3.5 h-3.5 ml-auto text-ink3" />
                </button>
              )}
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  )
}
