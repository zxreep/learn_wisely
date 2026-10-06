import { useMemo, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { motion } from 'framer-motion'
import { ArrowUpRight, Download, Layers, NotebookText, PanelsTopLeft, Sparkles, Users, Check } from 'lucide-react'
import { Button, Card, Chip, Modal, Page, PageHeader, Tabs } from '../components/ui'
import { DynIcon } from '../components/icons'
import { BOARD_TEMPLATES, DECK_TEMPLATES, NOTE_PACKS, type BoardTemplate, type DeckTemplate, type NotePack } from '../lib/templates'
import { useBoards } from '../stores/boards'
import { useLibrary } from '../stores/library'
import { useProgress } from '../stores/progress'
import { useUi } from '../stores/ui'
import { plural, truncate, cn } from '../lib/utils'
import { toast } from '../stores/toast'

type Tab = 'boards' | 'decks' | 'notes'

export default function Discover() {
  const [tab, setTab] = useState<Tab>('boards')
  return (
    <Page>
      <PageHeader
        title="Discover"
        subtitle="Curated study starter packs. One click clones one into your workspace — then it’s fully yours, editable and offline."
      />
      <Tabs
        options={[
          { value: 'boards', label: <span className="flex items-center gap-1.5"><PanelsTopLeft className="w-3.5 h-3.5" /> Starter boards</span> },
          { value: 'decks', label: <span className="flex items-center gap-1.5"><Layers className="w-3.5 h-3.5" /> Flashcard decks</span> },
          { value: 'notes', label: <span className="flex items-center gap-1.5"><NotebookText className="w-3.5 h-3.5" /> Note packs</span> },
        ]}
        value={tab}
        onChange={setTab}
        className="mb-5"
      />
      {tab === 'boards' && <BoardGrid />}
      {tab === 'decks' && <DeckGrid />}
      {tab === 'notes' && <NoteGrid />}
    </Page>
  )
}

function useAdded() {
  const boards = useBoards((s) => s.boards)
  const decks = useLibrary((s) => s.decks)
  const notes = useLibrary((s) => s.notes)
  return useMemo(
    () => ({
      board: (t: BoardTemplate) => boards.some((b) => b.fromDiscover && b.title === t.title),
      deck: (t: DeckTemplate) => decks.some((d) => d.fromDiscover && d.title === t.title),
      note: (t: NotePack) => notes.some((n) => n.title === t.title),
    }),
    [boards, decks, notes],
  )
}

/* ------------------------------- boards --------------------------------- */
function BoardGrid() {
  const added = useAdded()
  const createFromTemplate = useBoards((s) => s.createFromTemplate)
  const track = useProgress((s) => s.track)
  const navigate = useNavigate()
  const [preview, setPreview] = useState<BoardTemplate | null>(null)

  const use2 = (t: BoardTemplate) => {
    const id = createFromTemplate(t)
    track('content-added', 1, { label: `Cloned board “${t.title}”` })
    toast.success('Board added', `“${t.title}” is ready in your boards.`)
    navigate(`/boards/${id}`)
  }

  return (
    <>
      <div className="grid sm:grid-cols-2 xl:grid-cols-3 gap-4">
        {BOARD_TEMPLATES.map((t, i) => (
          <motion.div key={t.id} initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.05 }}>
            <Card className="p-4 h-full flex flex-col">
              <div className="flex items-start gap-3">
                <span className="grid place-items-center w-10 h-10 rounded-xl shrink-0" style={{ backgroundColor: t.color + '22', color: t.color }}>
                  <DynIcon name={t.icon} className="w-5 h-5" />
                </span>
                <div className="min-w-0">
                  <h3 className="font-display font-semibold text-[15px] leading-tight">{t.title}</h3>
                  <p className="text-[12px] text-ink3 mt-1 leading-snug">{t.description}</p>
                </div>
              </div>
              <div className="flex flex-wrap items-center gap-1.5 mt-3">
                <Chip color={t.color}>{t.category}</Chip>
                <Chip><Download className="w-3 h-3" /> {(t.uses / 1000).toFixed(1)}k uses</Chip>
              </div>
              <div className="text-[11.5px] text-ink3 mt-2.5 flex items-center gap-1 flex-wrap">
                {t.columns.map((c, j) => (
                  <span key={c} className="flex items-center gap-1">
                    {j > 0 && <span className="opacity-50">→</span>}
                    <span className="bg-surface2 border border-line/60 rounded-md px-1.5 py-0.5">{c}</span>
                  </span>
                ))}
              </div>
              <div className="flex gap-1.5 mt-4 pt-1">
                <Button size="sm" variant="ghost" onClick={() => setPreview(t)}>Preview</Button>
                <Button size="sm" className="ml-auto" disabled={added.board(t)} onClick={() => use2(t)}>
                  {added.board(t) ? <><Check className="w-3.5 h-3.5" /> Added</> : <><ArrowUpRight className="w-3.5 h-3.5" /> Use template</>}
                </Button>
              </div>
            </Card>
          </motion.div>
        ))}
      </div>

      {/* preview modal */}
      <Modal open={!!preview} onClose={() => setPreview(null)} wide>
        {preview && (
          <div className="p-6">
            <div className="flex items-center gap-3 mb-4">
              <span className="grid place-items-center w-11 h-11 rounded-xl" style={{ backgroundColor: preview.color + '22', color: preview.color }}>
                <DynIcon name={preview.icon} className="w-5 h-5" />
              </span>
              <div>
                <h2 className="font-display text-xl font-semibold">{preview.title}</h2>
                <div className="text-[12.5px] text-ink3">{plural(preview.cards.length, 'card')} across {plural(preview.columns.length, 'column')}</div>
              </div>
            </div>
            <div className="grid sm:grid-cols-3 gap-3">
              {preview.columns.map((col, ci) => (
                <div key={ci} className="rounded-xl bg-surface2/50 border border-line/60 p-3">
                  <div className="text-[12px] font-semibold mb-2">{col}</div>
                  <div className="space-y-1.5">
                    {preview.cards.filter((c) => Math.min(c.col, preview.columns.length - 1) === ci).map((c, j) => (
                      <div key={j} className="bg-surface border border-line/60 rounded-lg p-2 text-[12px] font-medium">{c.title}</div>
                    ))}
                  </div>
                </div>
              ))}
            </div>
            <div className="flex justify-end gap-2 mt-5">
              <Button variant="ghost" onClick={() => setPreview(null)}>Close</Button>
              <Button disabled={added.board(preview)} onClick={() => { setPreview(null); use2(preview) }}>
                {added.board(preview) ? 'Already added' : 'Use this template'}
              </Button>
            </div>
          </div>
        )}
      </Modal>
    </>
  )
}

/* -------------------------------- decks --------------------------------- */
function DeckGrid() {
  const added = useAdded()
  const { createDeck, addCards } = useLibrary.getState()
  const track = useProgress((s) => s.track)
  const openAi = useUi((s) => s.openAi)
  const [preview, setPreview] = useState<DeckTemplate | null>(null)
  const [flip, setFlip] = useState<number | null>(null)

  const add = (t: DeckTemplate) => {
    const id = createDeck(t.title, t.description, t.color)
    useLibrary.getState().updateDeck(id, { fromDiscover: true })
    addCards(id, t.cards)
    track('content-added', 1, { label: `Added deck “${t.title}”` })
    toast.success('Deck added to your library', `${t.cards.length} cards, due immediately — go get them.`)
  }

  return (
    <>
      <div className="grid sm:grid-cols-2 xl:grid-cols-3 gap-4">
        {DECK_TEMPLATES.map((t, i) => (
          <motion.div key={t.id} initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.05 }}>
            <Card className="p-4 h-full flex flex-col">
              <div className="flex items-start gap-3">
                <span className="grid place-items-center w-10 h-10 rounded-xl shrink-0" style={{ backgroundColor: t.color + '22', color: t.color }}>
                  <Layers className="w-5 h-5" />
                </span>
                <div className="min-w-0">
                  <h3 className="font-display font-semibold text-[15px] leading-tight">{t.title}</h3>
                  <p className="text-[12px] text-ink3 mt-1 leading-snug line-clamp-2">{t.description}</p>
                </div>
              </div>
              <div className="flex flex-wrap items-center gap-1.5 mt-3">
                <Chip color={t.color}>{t.subject}</Chip>
                <Chip>{plural(t.cards.length, 'card')}</Chip>
                <Chip><Users className="w-3 h-3" /> {(t.downloads / 1000).toFixed(1)}k</Chip>
              </div>
              <div className="flex gap-1.5 mt-4 pt-1">
                <Button size="sm" variant="ghost" onClick={() => { setPreview(t); setFlip(null) }}>Preview</Button>
                <Button size="sm" className="ml-auto" disabled={added.deck(t)} onClick={() => add(t)}>
                  {added.deck(t) ? <><Check className="w-3.5 h-3.5" /> Added</> : <><ArrowUpRight className="w-3.5 h-3.5" /> Add to library</>}
                </Button>
              </div>
            </Card>
          </motion.div>
        ))}
      </div>

      <Modal open={!!preview} onClose={() => setPreview(null)} wide>
        {preview && (
          <div className="p-6">
            <div className="flex flex-wrap items-center gap-3 mb-4">
              <span className="grid place-items-center w-11 h-11 rounded-xl" style={{ backgroundColor: preview.color + '22', color: preview.color }}>
                <Layers className="w-5 h-5" />
              </span>
              <div className="flex-1 min-w-0">
                <h2 className="font-display text-xl font-semibold">{preview.title}</h2>
                <div className="text-[12.5px] text-ink3">Tap a card to flip it</div>
              </div>
              <Button
                size="sm" variant="subtle"
                onClick={() => {
                  setPreview(null)
                  const first = preview.cards[0]
                  toast.info('Tip', 'Add the deck, then use “Quiz me” on it from the library.')
                  void first
                  openAi('quiz')
                }}
              >
                <Sparkles className="w-3.5 h-3.5 text-accent2" /> Quiz preview
              </Button>
            </div>
            <div className="grid sm:grid-cols-2 gap-2 max-h-[46vh] overflow-y-auto pr-1">
              {preview.cards.map((c, i) => (
                <button
                  key={i}
                  onClick={() => setFlip(flip === i ? null : i)}
                  className={cn(
                    'rounded-xl border p-3 text-left transition-all',
                    flip === i ? 'border-accent/50 bg-accent/5' : 'border-line/70 bg-surface hover:border-ink3/40',
                  )}
                >
                  <div className="text-[12.5px] font-semibold leading-snug">{c.front}</div>
                  {flip === i && <div className="text-[12px] text-ink2 mt-1.5 leading-snug">{c.back}</div>}
                </button>
              ))}
            </div>
            <div className="flex justify-end gap-2 mt-5">
              <Button variant="ghost" onClick={() => setPreview(null)}>Close</Button>
              <Button disabled={added.deck(preview)} onClick={() => { setPreview(null); add(preview) }}>
                {added.deck(preview) ? 'Already added' : `Add all ${preview.cards.length} cards`}
              </Button>
            </div>
          </div>
        )}
      </Modal>
    </>
  )
}

/* -------------------------------- notes --------------------------------- */
function NoteGrid() {
  const added = useAdded()
  const track = useProgress((s) => s.track)
  const [preview, setPreview] = useState<NotePack | null>(null)

  const add = (t: NotePack) => {
    useLibrary.getState().createNote({ title: t.title, content: t.content, color: t.color, tags: ['starter-pack'] })
    track('content-added', 1, { label: `Added note pack “${t.title}”` })
    toast.success('Note pack added', 'Find it at the top of your library.')
  }

  return (
    <>
      <div className="grid sm:grid-cols-2 xl:grid-cols-3 gap-4">
        {NOTE_PACKS.map((t, i) => (
          <motion.div key={t.id} initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.05 }}>
            <Card className="p-4 h-full flex flex-col">
              <div className="flex items-start gap-3">
                <span className="grid place-items-center w-10 h-10 rounded-xl shrink-0" style={{ backgroundColor: t.color + '22', color: t.color }}>
                  <NotebookText className="w-5 h-5" />
                </span>
                <div className="min-w-0">
                  <h3 className="font-display font-semibold text-[15px] leading-tight">{t.title}</h3>
                  <p className="text-[12px] text-ink3 mt-1 leading-snug line-clamp-2">{t.description}</p>
                </div>
              </div>
              <p className="text-[11.5px] text-ink3 mt-3 line-clamp-2 leading-snug italic">
                “{truncate(t.content.replace(/[#*=\n]/g, ' ').trim(), 110)}”
              </p>
              <div className="flex gap-1.5 mt-4 pt-1">
                <Button size="sm" variant="ghost" onClick={() => setPreview(t)}>Preview</Button>
                <Button size="sm" className="ml-auto" disabled={added.note(t)} onClick={() => add(t)}>
                  {added.note(t) ? <><Check className="w-3.5 h-3.5" /> Added</> : <><ArrowUpRight className="w-3.5 h-3.5" /> Add to notes</>}
                </Button>
              </div>
            </Card>
          </motion.div>
        ))}
      </div>

      <Modal open={!!preview} onClose={() => setPreview(null)}>
        {preview && (
          <div className="p-6">
            <h2 className="font-display text-xl font-semibold mb-3">{preview.title}</h2>
            <div className="rounded-xl bg-surface2/50 border border-line/60 p-4 max-h-[46vh] overflow-y-auto text-[12.5px] leading-relaxed whitespace-pre-line font-mono">
              {preview.content}
            </div>
            <div className="flex justify-end gap-2 mt-5">
              <Button variant="ghost" onClick={() => setPreview(null)}>Close</Button>
              <Button disabled={added.note(preview)} onClick={() => { setPreview(null); add(preview) }}>
                {added.note(preview) ? 'Already added' : 'Add to notes'}
              </Button>
            </div>
          </div>
        )}
      </Modal>
    </>
  )
}
