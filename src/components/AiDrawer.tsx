import { useEffect, useMemo, useState } from 'react'
import { AnimatePresence, motion } from 'framer-motion'
import {
  ArrowRight, BookMarked, Check, Copy, Layers, Loader2, NotebookText, Sparkles, X,
} from 'lucide-react'
import { useUi, type AiMode } from '../stores/ui'
import { useLibrary, allDue } from '../stores/library'
import { ask, explain, generateFlashcards, keyTerms, quizFromCards, summarize, type AskResult, type QuizQuestion } from '../lib/ai'
import { Button, Chip, Input, Select } from './ui'
import { QuizRunner } from './QuizRunner'
import { toast } from '../stores/toast'
import { cn, truncate } from '../lib/utils'
import { OwlMark } from './icons'

const MODES: { id: AiMode; label: string }[] = [
  { id: 'ask', label: 'Ask' },
  { id: 'summarize', label: 'Summarize' },
  { id: 'flashcards', label: 'Flashcards' },
  { id: 'quiz', label: 'Quiz me' },
  { id: 'explain', label: 'Explain' },
]

const THINKING: Record<AiMode, string[]> = {
  ask: ['Reading your library…', 'Ranking passages…', 'Composing an answer…'],
  summarize: ['Parsing the note…', 'Scoring sentences…', 'Picking the keepers…'],
  flashcards: ['Looking for definitions…', 'Finding key terms…', 'Drafting cards…'],
  quiz: ['Shuffling cards…', 'Picking distractors…'],
  explain: ['Scanning your notes…', 'Gathering mentions…'],
}

function useThinking(active: boolean, mode: AiMode) {
  const [step, setStep] = useState(0)
  useEffect(() => {
    if (!active) { setStep(0); return }
    const steps = THINKING[mode]
    if (steps.length <= 1) return
    const t = setInterval(() => setStep((s) => Math.min(s + 1, steps.length - 1)), 420)
    return () => clearInterval(t)
  }, [active, mode])
  return THINKING[mode][Math.min(step, THINKING[mode].length - 1)]
}

export function AiDrawer() {
  const { ai, closeAi, openAi } = useUi()
  const { notes, decks, cards } = useLibrary()

  const note = notes.find((n) => n.id === ai.noteId)
  const deck = decks.find((d) => d.id === ai.deckId)

  return (
    <AnimatePresence>
      {ai.open && (
        <>
          <motion.div
            className="fixed inset-0 z-[60] bg-ink/25 dark:bg-black/50 backdrop-blur-[1px]"
            initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            onClick={closeAi}
          />
          <motion.aside
            className="fixed right-0 top-0 bottom-0 z-[61] w-full sm:w-[430px] bg-surface border-l border-line shadow-pop flex flex-col"
            initial={{ x: '100%' }} animate={{ x: 0 }} exit={{ x: '100%' }}
            transition={{ type: 'spring', damping: 30, stiffness: 300 }}
            role="dialog"
            aria-label="Wisely AI assistant"
          >
            {/* header */}
            <div className="px-4 py-3.5 border-b border-line/70 flex items-center gap-2.5">
              <OwlMark className="w-8 h-8 shrink-0" />
              <div className="min-w-0">
                <div className="font-display font-semibold text-[15px] leading-tight flex items-center gap-1.5">
                  Ask Wisely <Sparkles className="w-3.5 h-3.5 text-accent2" />
                </div>
                <div className="text-[11px] text-ink3">On-device AI · works offline · reads only your library</div>
              </div>
              <button onClick={closeAi} className="ml-auto p-1.5 rounded-lg text-ink3 hover:bg-surface2" aria-label="Close">
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* mode tabs */}
            <div className="px-3 pt-3 pb-2 border-b border-line/50 flex gap-1 overflow-x-auto no-scrollbar">
              {MODES.map((m) => (
                <button
                  key={m.id}
                  onClick={() => openAi(m.id, { noteId: ai.noteId, deckId: ai.deckId })}
                  className={cn(
                    'px-2.5 h-7 rounded-lg text-[12px] font-medium whitespace-nowrap transition-colors',
                    ai.mode === m.id ? 'bg-accent/12 text-accent' : 'text-ink3 hover:text-ink hover:bg-surface2',
                  )}
                >
                  {m.label}
                </button>
              ))}
            </div>

            {/* context chip */}
            {(note || deck) && (
              <div className="px-4 py-2 border-b border-line/40 bg-surface2/50 flex items-center gap-2 text-[12px] text-ink2">
                {note ? <NotebookText className="w-3.5 h-3.5 text-accent" /> : <Layers className="w-3.5 h-3.5 text-accent" />}
                <span className="truncate font-medium">{note ? note.title : deck!.title}</span>
                {deck && <Chip color={deck.color}>{cards.filter((c) => c.deckId === deck.id).length} cards</Chip>}
              </div>
            )}

            {/* body */}
            <div className="flex-1 overflow-y-auto">
              {ai.mode === 'ask' && <AskPane corpus={notes} />}
              {ai.mode === 'summarize' && <SummarizePane />}
              {ai.mode === 'flashcards' && <FlashcardsPane />}
              {ai.mode === 'quiz' && <QuizPane />}
              {ai.mode === 'explain' && <ExplainPane corpus={notes} />}
            </div>
          </motion.aside>
        </>
      )}
    </AnimatePresence>
  )
}

/* --------------------------------- Ask ---------------------------------- */
function AskPane({ corpus }: { corpus: { title: string; content: string }[] }) {
  const [q, setQ] = useState('')
  const [thinking, setThinking] = useState(false)
  const [result, setResult] = useState<AskResult | null>(null)
  const status = useThinking(thinking, 'ask')

  const run = () => {
    if (!q.trim()) return
    setThinking(true)
    setResult(null)
    setTimeout(() => {
      setResult(ask(q, corpus))
      setThinking(false)
    }, 900)
  }

  return (
    <div className="p-4 space-y-3">
      <div className="flex gap-2">
        <Input
          value={q}
          onChange={(e) => setQ(e.target.value)}
          onKeyDown={(e) => e.key === 'Enter' && run()}
          placeholder="Ask anything about your notes…"
          autoFocus
        />
        <Button onClick={run} disabled={!q.trim() || thinking} size="icon" aria-label="Ask">
          <ArrowRight className="w-4 h-4" />
        </Button>
      </div>
      <div className="flex flex-wrap gap-1.5">
        {['What is mitosis?', 'causes of the French Revolution', 'chain rule', 'what did I write about deep work?'].map((s) => (
          <button key={s} onClick={() => setQ(s)} className="text-[11px] px-2 py-1 rounded-full bg-surface2 hover:bg-surface3 text-ink2 border border-line/60 transition-colors">
            {s}
          </button>
        ))}
      </div>

      {thinking && <Thinking status={status} />}

      {result && (
        <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} className="space-y-3">
          <div className="rounded-2xl bg-surface2/60 border border-line/60 p-3.5 text-[13.5px] leading-relaxed whitespace-pre-line">
            {result.answer}
          </div>
          {result.sources.length > 0 && (
            <div>
              <div className="text-[11px] font-semibold text-ink3 uppercase tracking-wide mb-1.5">Sources in your library</div>
              <div className="space-y-1.5">
                {result.sources.map((s, i) => (
                  <div key={i} className="rounded-xl border border-line/60 bg-surface p-2.5">
                    <div className="flex items-center gap-1.5 text-[12px] font-semibold text-accent">
                      <BookMarked className="w-3.5 h-3.5" /> {s.title}
                    </div>
                    <div className="text-[12px] text-ink2 mt-1 leading-snug">{truncate(s.snippet, 140)}</div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </motion.div>
      )}

      {!result && !thinking && (
        <div className="text-[12px] text-ink3 leading-relaxed px-1 pt-2">
          I answer from <em>your</em> notes, not the internet — so nothing gets sent anywhere, and it works on a plane.
        </div>
      )}
    </div>
  )
}

/* ------------------------------ Summarize ------------------------------- */
function SummarizePane() {
  const { ai } = useUi()
  const { notes, updateNote } = useLibrary()
  const [noteId, setNoteId] = useState(ai.noteId ?? notes[0]?.id ?? '')
  const note = notes.find((n) => n.id === noteId)
  const [thinking, setThinking] = useState(false)
  const [bullets, setBullets] = useState<string[] | null>(null)
  const status = useThinking(thinking, 'summarize')

  useEffect(() => {
    if (ai.noteId) setNoteId(ai.noteId)
  }, [ai.noteId])

  const run = () => {
    if (!note) return
    setThinking(true); setBullets(null)
    setTimeout(() => {
      setBullets(summarize(note.content))
      setThinking(false)
    }, 950)
  }

  const insert = () => {
    if (!note || !bullets) return
    const block = `## Summary (Wisely AI)\n${bullets.map((b) => `- ${b}`).join('\n')}\n\n---\n\n`
    updateNote(note.id, { content: block + note.content })
    toast.success('Summary inserted', 'Added to the top of your note.')
  }

  return (
    <div className="p-4 space-y-3">
      <Select value={noteId} onChange={(e) => { setNoteId(e.target.value); setBullets(null) }} className="w-full">
        {notes.map((n) => <option key={n.id} value={n.id}>{n.title}</option>)}
      </Select>

      {!note && <Hint text="Create a note first, then come back." />}
      {note && !bullets && !thinking && (
        <Hint text={`Condense “${truncate(note.title, 40)}” into the ${Math.min(4, 5)} sentences that matter most.`} action={<Button size="sm" onClick={run}>Summarize</Button>} />
      )}
      {thinking && <Thinking status={status} />}
      {bullets && note && (
        <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} className="space-y-3">
          <ul className="space-y-2">
            {bullets.map((b, i) => (
              <li key={i} className="flex gap-2.5 text-[13.5px] leading-relaxed">
                <span className="font-display font-bold text-accent shrink-0">{i + 1}.</span>
                {b}
              </li>
            ))}
          </ul>
          <Terms text={note.content} />
          <div className="flex gap-2 pt-1">
            <Button size="sm" onClick={insert}><NotebookText className="w-3.5 h-3.5" /> Insert into note</Button>
            <Button size="sm" variant="subtle" onClick={() => { navigator.clipboard.writeText(bullets.join('\n')); toast.success('Copied to clipboard') }}>
              <Copy className="w-3.5 h-3.5" /> Copy
            </Button>
          </div>
        </motion.div>
      )}
    </div>
  )
}

/* ------------------------------ Flashcards ------------------------------ */
function FlashcardsPane() {
  const { ai } = useUi()
  const { notes, decks, createDeck, addCards } = useLibrary()
  const [noteId, setNoteId] = useState(ai.noteId ?? notes[0]?.id ?? '')
  const [deckId, setDeckId] = useState<string>('new')
  const note = notes.find((n) => n.id === noteId)
  const [thinking, setThinking] = useState(false)
  const [gen, setGen] = useState<{ front: string; back: string }[] | null>(null)
  const status = useThinking(thinking, 'flashcards')

  useEffect(() => {
    if (ai.noteId) setNoteId(ai.noteId)
  }, [ai.noteId])

  const run = () => {
    if (!note) return
    setThinking(true); setGen(null)
    setTimeout(() => {
      setGen(generateFlashcards(note.title, note.content))
      setThinking(false)
    }, 1100)
  }

  const commit = () => {
    if (!gen || gen.length === 0) return
    const target = deckId === 'new'
      ? createDeck(`${note!.title} — cards`, 'Generated by Wisely AI', '#7d8a4f')
      : deckId
    addCards(target, gen)
    toast.success(`${gen.length} flashcards added`, deckId === 'new' ? 'New deck created from your note.' : 'Added to the selected deck.')
    setGen(null)
  }

  return (
    <div className="p-4 space-y-3">
      <Select value={noteId} onChange={(e) => { setNoteId(e.target.value); setGen(null) }} className="w-full">
        {notes.map((n) => <option key={n.id} value={n.id}>{n.title}</option>)}
      </Select>

      {!note && <Hint text="Create a note first." />}
      {note && !gen && !thinking && (
        <Hint
          text="I’ll scan for definitions, dates and key terms, then draft cards you can review."
          action={<Button size="sm" onClick={run}>Generate flashcards</Button>}
        />
      )}
      {thinking && <Thinking status={status} />}
      {gen && (
        <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} className="space-y-3">
          {gen.length === 0 && <Hint text="Couldn’t find card-worthy sentences in this note — try a denser one." />}
          <div className="space-y-2 max-h-[300px] overflow-y-auto pr-1">
            {gen.map((c, i) => (
              <div key={i} className="rounded-xl border border-line/60 p-2.5 bg-surface">
                <div className="text-[12.5px] font-semibold leading-snug">{c.front}</div>
                <div className="text-[12px] text-ink2 mt-1 leading-snug">{truncate(c.back, 120)}</div>
              </div>
            ))}
          </div>
          {gen.length > 0 && (
            <div className="flex items-end gap-2 pt-1">
              <div className="flex-1">
                <label className="text-[11px] font-semibold text-ink3 uppercase tracking-wide">Add to deck</label>
                <Select value={deckId} onChange={(e) => setDeckId(e.target.value)} className="w-full mt-1">
                  <option value="new">＋ New deck from this note</option>
                  {decks.map((d) => <option key={d.id} value={d.id}>{d.title}</option>)}
                </Select>
              </div>
              <Button size="sm" onClick={commit}><Check className="w-3.5 h-3.5" /> Add {gen.length}</Button>
            </div>
          )}
        </motion.div>
      )}
    </div>
  )
}

/* --------------------------------- Quiz --------------------------------- */
function QuizPane() {
  const { ai } = useUi()
  const { decks, cards } = useLibrary()
  const [deckId, setDeckId] = useState(ai.deckId ?? decks[0]?.id ?? '')
  const [questions, setQuestions] = useState<QuizQuestion[] | null>(null)
  const [thinking, setThinking] = useState(false)
  const status = useThinking(thinking, 'quiz')
  const deck = decks.find((d) => d.id === deckId)
  const dueCount = useMemo(() => (deckId ? allDue(cards).filter((c) => c.deckId === deckId).length : 0), [cards, deckId])

  useEffect(() => {
    if (ai.deckId) setDeckId(ai.deckId)
  }, [ai.deckId])

  const run = (dueOnly: boolean) => {
    if (!deck) return
    setThinking(true); setQuestions(null)
    const pool = dueOnly ? allDue(cards).filter((c) => c.deckId === deck.id) : cards.filter((c) => c.deckId === deck.id)
    setTimeout(() => {
      setQuestions(quizFromCards(pool, 6))
      setThinking(false)
    }, 800)
  }

  if (questions) {
    return (
      <QuizRunner
        questions={questions}
        title={deck ? deck.title : 'Quiz'}
        onClose={() => setQuestions(null)}
      />
    )
  }

  return (
    <div className="p-4 space-y-3">
      <Select value={deckId} onChange={(e) => setDeckId(e.target.value)} className="w-full">
        {decks.map((d) => <option key={d.id} value={d.id}>{d.title}</option>)}
      </Select>
      {!deck && <Hint text="Create a deck with at least 4 cards to quiz." />}
      {deck && !thinking && (
        <Hint
          text={`Multiple-choice from “${truncate(deck.title, 36)}” — distractors are other cards’ answers. ${dueCount > 0 ? `${dueCount} cards are due.` : ''}`}
          action={
            <div className="flex gap-2">
              <Button size="sm" onClick={() => run(false)}>Quiz me (6)</Button>
              {dueCount >= 4 && <Button size="sm" variant="subtle" onClick={() => run(true)}>Due only</Button>}
            </div>
          }
        />
      )}
      {thinking && <Thinking status={status} />}
    </div>
  )
}

/* ------------------------------- Explain -------------------------------- */
function ExplainPane({ corpus }: { corpus: { title: string; content: string }[] }) {
  const [term, setTerm] = useState('')
  const [thinking, setThinking] = useState(false)
  const [out, setOut] = useState<string | null>(null)
  const status = useThinking(thinking, 'explain')

  const run = () => {
    if (!term.trim()) return
    setThinking(true); setOut(null)
    setTimeout(() => {
      setOut(explain(term, corpus))
      setThinking(false)
    }, 800)
  }

  return (
    <div className="p-4 space-y-3">
      <div className="flex gap-2">
        <Input
          value={term}
          onChange={(e) => setTerm(e.target.value)}
          onKeyDown={(e) => e.key === 'Enter' && run()}
          placeholder="A concept you keep forgetting… e.g. anaphase"
          autoFocus
        />
        <Button onClick={run} disabled={!term.trim() || thinking} size="icon" aria-label="Explain">
          <ArrowRight className="w-4 h-4" />
        </Button>
      </div>
      {thinking && <Thinking status={status} />}
      {out && (
        <motion.div
          initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }}
          className="rounded-2xl border border-line/60 bg-surface2/60 p-3.5 text-[13.5px] leading-relaxed whitespace-pre-line"
        >
          {out}
        </motion.div>
      )}
      {!out && !thinking && (
        <div className="text-[12px] text-ink3 leading-relaxed px-1 pt-1">
          I gather every sentence in your library that mentions the term and stitch them into one explanation —
          your notes, echoed back to you.
        </div>
      )}
    </div>
  )
}

/* --------------------------------- bits --------------------------------- */
function Thinking({ status }: { status: string }) {
  return (
    <div className="flex items-center gap-2.5 px-1 py-6 text-[13px] text-ink2">
      <Loader2 className="w-4 h-4 animate-spin text-accent" />
      <motion.span key={status} initial={{ opacity: 0 }} animate={{ opacity: 1 }}>{status}</motion.span>
    </div>
  )
}

function Hint({ text, action }: { text: string; action?: React.ReactNode }) {
  return (
    <div className="rounded-2xl border border-dashed border-line bg-surface2/40 p-4">
      <div className="text-[13px] text-ink2 leading-relaxed">{text}</div>
      {action && <div className="mt-3">{action}</div>}
    </div>
  )
}

function Terms({ text }: { text: string }) {
  const terms = keyTerms(text, 6)
  if (terms.length === 0) return null
  return (
    <div className="flex flex-wrap items-center gap-1.5 pt-1">
      <span className="text-[11px] font-semibold text-ink3 uppercase tracking-wide mr-1">Key terms</span>
      {terms.map((t) => <Chip key={t.term}>{t.term}</Chip>)}
    </div>
  )
}
