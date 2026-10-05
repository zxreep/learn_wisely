import { useEffect, useMemo, useRef, useState } from 'react'
import { useSearchParams } from 'react-router-dom'
import { AnimatePresence, motion } from 'framer-motion'
import {
  ArrowLeft, BookOpen, Check, ChevronRight, Download, FileText, FileUp, Folder,
  FolderPlus, Highlighter, Layers, List, MoreHorizontal, NotebookPen, Pin, Plus,
  RotateCcw, Search, Sparkles, Star, Tag, Trash2, Upload, Bold,
} from 'lucide-react'
import { Button, Card, Chip, EmptyState, Input, Modal, Page, PageHeader, ProgressBar, Select, Tabs, Textarea } from '../components/ui'
import { useLibrary, dueOfDeck, masteryOf, cardsOfDeck, allDue } from '../stores/library'
import { useUi } from '../stores/ui'
import type { Deck, Flashcard, Note, Rating } from '../lib/types'
import { cn, mdLite, plural, timeAgo, truncate, uid } from '../lib/utils'
import { toast } from '../stores/toast'

type Tab = 'notes' | 'decks' | 'files'

export default function Library() {
  const [params, setParams] = useSearchParams()
  const tab = (params.get('tab') as Tab) ?? 'notes'
  const noteId = params.get('note')
  const deckId = params.get('deck')
  const { folders, deleteFolder } = useLibrary()
  const [folderFilter, setFolderFilter] = useState<string | 'all' | 'fav'>('all')
  const [query, setQuery] = useState('')
  const [folderModal, setFolderModal] = useState(false)

  const setTab = (t: Tab) => setParams(t === 'notes' ? {} : { tab: t })
  const openNote = (id: string | null) => setParams(id ? { note: id } : {})
  const openDeck = (id: string | null) => setParams(id ? { deck: id } : { tab: 'decks' })

  return (
    <Page className="max-w-[1280px]">
      {noteId ? (
        <NoteEditor noteId={noteId} onBack={() => openNote(null)} />
      ) : deckId ? (
        <DeckDetail deckId={deckId} onBack={() => openDeck(null)} />
      ) : (
        <>
          <PageHeader
            title="Library"
            subtitle="Notes, decks and files — everything feeds the on-device AI."
            actions={
              <>
                {tab === 'files' && (
                  <Button variant="subtle" onClick={() => document.getElementById('lib-file-input')?.click()}>
                    <Upload className="w-4 h-4" /> Upload
                  </Button>
                )}
                <Button onClick={() => openNote(useLibrary.getState().createNote({ folderId: folderFilter === 'all' || folderFilter === 'fav' ? null : folderFilter }))}>
                  <NotebookPen className="w-4 h-4" /> New note
                </Button>
              </>
            }
          />

          <div className="flex gap-6">
            {/* folder rail */}
            <aside className="hidden md:block w-[190px] shrink-0">
              <div className="sticky top-20 space-y-0.5">
                <RailItem active={folderFilter === 'all'} onClick={() => setFolderFilter('all')} icon={<BookOpen className="w-4 h-4" />} label="All items" />
                <RailItem active={folderFilter === 'fav'} onClick={() => setFolderFilter('fav')} icon={<Star className="w-4 h-4" />} label="Favorites" />
                <div className="pt-3 pb-1 px-2 text-[10px] font-semibold uppercase tracking-[0.12em] text-ink3 flex items-center justify-between">
                  Folders
                  <button onClick={() => setFolderModal(true)} className="p-0.5 rounded hover:bg-surface2" aria-label="New folder">
                    <FolderPlus className="w-3.5 h-3.5" />
                  </button>
                </div>
                {folders.map((f) => (
                  <RailItem
                    key={f.id}
                    active={folderFilter === f.id}
                    onClick={() => setFolderFilter(f.id)}
                    icon={<Folder className="w-4 h-4" style={{ color: f.color }} />}
                    label={f.name}
                    onDelete={() => { if (confirm(`Delete folder “${f.name}”? Items move to the root.`)) deleteFolder(f.id) }}
                  />
                ))}
                {folders.length === 0 && <div className="text-[12px] text-ink3 px-2">No folders yet.</div>}
              </div>
            </aside>

            <div className="flex-1 min-w-0">
              <div className="flex flex-wrap items-center gap-2 mb-4">
                <Tabs
                  options={[
                    { value: 'notes', label: 'Notes' },
                    { value: 'decks', label: 'Flashcards' },
                    { value: 'files', label: 'Files' },
                  ]}
                  value={tab}
                  onChange={setTab}
                />
                <div className="relative flex-1 min-w-[180px] max-w-xs ml-auto">
                  <Search className="w-3.5 h-3.5 text-ink3 absolute left-3 top-1/2 -translate-y-1/2" />
                  <Input value={query} onChange={(e) => setQuery(e.target.value)} placeholder="Search library…" className="pl-8 h-[34px] text-[13px]" />
                </div>
              </div>

              {tab === 'notes' && <NotesGrid query={query} filter={folderFilter} onOpen={openNote} />}
              {tab === 'decks' && <DecksGrid query={query} onOpen={openDeck} />}
              {tab === 'files' && <FilesPane query={query} filter={folderFilter} />}
            </div>
          </div>
        </>
      )}

      <FolderModal open={folderModal} onClose={() => setFolderModal(false)} />
    </Page>
  )
}

function RailItem({ active, onClick, icon, label, onDelete }: { active: boolean; onClick: () => void; icon: React.ReactNode; label: string; onDelete?: () => void }) {
  return (
    <div className={cn('group flex items-center gap-2 px-2.5 h-9 rounded-xl text-[13px] cursor-pointer transition-colors', active ? 'bg-surface shadow-card border border-line/70 font-semibold' : 'text-ink2 hover:bg-surface2')}>
      <button onClick={onClick} className="flex items-center gap-2 flex-1 min-w-0 text-left">
        {icon}
        <span className="truncate">{label}</span>
      </button>
      {onDelete && (
        <button onClick={onDelete} className="opacity-0 group-hover:opacity-100 text-ink3 hover:text-danger transition-all p-0.5" aria-label={`Delete ${label}`}>
          <Trash2 className="w-3 h-3" />
        </button>
      )}
    </div>
  )
}

function FolderModal({ open, onClose }: { open: boolean; onClose: () => void }) {
  const [name, setName] = useState('')
  const [color, setColor] = useState('#3f7d58')
  const addFolder = useLibrary((s) => s.addFolder)
  const colors = ['#3f7d58', '#c2703e', '#5b7fb0', '#a35d8a', '#96762f', '#5d8a83']
  return (
    <Modal open={open} onClose={onClose}>
      <div className="p-6">
        <h2 className="font-display text-xl font-semibold mb-4">New folder</h2>
        <Input value={name} onChange={(e) => setName(e.target.value)} placeholder="e.g. Organic Chemistry" autoFocus onKeyDown={(e) => { if (e.key === 'Enter' && name.trim()) { addFolder(name.trim(), color); setName(''); onClose() } }} />
        <div className="flex gap-2 mt-3">
          {colors.map((c) => (
            <button key={c} onClick={() => setColor(c)} className={cn('w-7 h-7 rounded-full', color === c && 'ring-2 ring-offset-2 ring-ink/40 dark:ring-surface')} style={{ backgroundColor: c }} aria-label={c} />
          ))}
        </div>
        <div className="flex justify-end gap-2 mt-5">
          <Button variant="ghost" onClick={onClose}>Cancel</Button>
          <Button disabled={!name.trim()} onClick={() => { addFolder(name.trim(), color); setName(''); onClose() }}>Create</Button>
        </div>
      </div>
    </Modal>
  )
}

/* --------------------------------- Notes -------------------------------- */
function NotesGrid({ query, filter, onOpen }: { query: string; filter: string; onOpen: (id: string) => void }) {
  const { notes, updateNote } = useLibrary()
  const shown = useMemo(() => {
    let list = [...notes].sort((a, b) => b.updatedAt - a.updatedAt)
    if (filter === 'fav') list = list.filter((n) => n.favorite)
    else if (filter !== 'all') list = list.filter((n) => n.folderId === filter)
    if (query.trim()) {
      const q = query.toLowerCase()
      list = list.filter((n) => (n.title + n.content + n.tags.join(' ')).toLowerCase().includes(q))
    }
    return list
  }, [notes, query, filter])

  if (shown.length === 0) {
    return (
      <Card>
        <EmptyState
          icon={<NotebookPen className="w-10 h-10" />}
          title={query ? `No notes match “${query}”` : 'No notes here yet'}
          desc="Capture what you learn — Wisely turns notes into summaries, flashcards and quizzes."
          action={<Button size="sm" onClick={() => onOpen(useLibrary.getState().createNote())}><Plus className="w-3.5 h-3.5" /> New note</Button>}
        />
      </Card>
    )
  }

  return (
    <div className="grid sm:grid-cols-2 xl:grid-cols-3 gap-3.5">
      {shown.map((n, i) => (
        <motion.button
          key={n.id}
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: Math.min(i * 0.03, 0.2) }}
          onClick={() => onOpen(n.id)}
          className="text-left group"
        >
          <Card className="p-4 h-[158px] flex flex-col hover:shadow-lift hover:border-ink3/40 transition-all relative overflow-hidden">
            <span className="absolute left-0 top-0 bottom-0 w-1" style={{ backgroundColor: n.color ?? 'rgb(var(--c-line))' }} />
            <div className="flex items-start justify-between gap-2 pl-1.5">
              <h3 className="font-display font-semibold text-[14.5px] leading-snug line-clamp-2">{n.title}</h3>
              <button
                onClick={(e) => { e.stopPropagation(); updateNote(n.id, { favorite: !n.favorite }) }}
                className={cn('shrink-0 p-1 rounded-lg transition-colors', n.favorite ? 'text-accent2' : 'text-ink3/40 hover:text-accent2 opacity-0 group-hover:opacity-100')}
                aria-label="Favorite"
              >
                <Star className={cn('w-3.5 h-3.5', n.favorite && 'fill-accent2')} />
              </button>
            </div>
            <p className="text-[12px] text-ink3 leading-snug line-clamp-3 mt-1.5 pl-1.5 flex-1">
              {n.content.replace(/[#*=`>-]/g, '').slice(0, 180)}
            </p>
            <div className="flex items-center gap-1.5 mt-2 pl-1.5">
              {n.tags.slice(0, 2).map((t) => <Chip key={t}>{t}</Chip>)}
              <span className="text-[10.5px] text-ink3 ml-auto shrink-0">{timeAgo(n.updatedAt)}</span>
            </div>
          </Card>
        </motion.button>
      ))}
    </div>
  )
}

/* ------------------------------ Note editor ----------------------------- */
function NoteEditor({ noteId, onBack }: { noteId: string; onBack: () => void }) {
  const { notes, folders, updateNote, deleteNote } = useLibrary()
  const { openAi } = useUi()
  const note = notes.find((n) => n.id === noteId)
  const [preview, setPreview] = useState(false)
  const [savedAt, setSavedAt] = useState<number | null>(null)
  const [tagInput, setTagInput] = useState('')
  const taRef = useRef<HTMLTextAreaElement>(null)

  // debounce "saved" indicator
  const patch = (p: Partial<Note>) => {
    if (!note) return
    updateNote(note.id, p)
    setSavedAt(Date.now())
  }

  if (!note) {
    return (
      <div className="text-center py-16 text-ink3">
        Note not found. <button onClick={onBack} className="text-accent hover:underline">Back to library</button>
      </div>
    )
  }

  const wrapSelection = (before: string, after = before) => {
    const ta = taRef.current
    if (!ta) return
    const { selectionStart: s, selectionEnd: e, value } = ta
    const sel = value.slice(s, e) || 'text'
    const next = value.slice(0, s) + before + sel + after + value.slice(e)
    patch({ content: next })
    requestAnimationFrame(() => {
      ta.focus()
      ta.setSelectionRange(s + before.length, s + before.length + sel.length)
    })
  }

  const prefixLines = (prefix: string) => {
    const ta = taRef.current
    if (!ta) return
    const { selectionStart: s, selectionEnd: e, value } = ta
    const seg = value.slice(s, e) || ''
    const replaced = seg.split('\n').map((l) => (l.startsWith(prefix) ? l : prefix + l)).join('\n')
    patch({ content: value.slice(0, s) + replaced + value.slice(e) })
  }

  const words = note.content.trim() ? note.content.trim().split(/\s+/).length : 0

  return (
    <div>
      {/* toolbar */}
      <div className="flex flex-wrap items-center gap-2 mb-4">
        <button onClick={onBack} className="p-2 rounded-xl text-ink3 hover:bg-surface2 hover:text-ink transition-colors" aria-label="Back">
          <ArrowLeft className="w-[18px] h-[18px]" />
        </button>
        <div className="text-[12px] text-ink3 flex items-center gap-1.5">
          {savedAt ? <><Check className="w-3.5 h-3.5 text-ok" /> Saved {timeAgo(savedAt)}</> : 'All changes save automatically'}
        </div>
        <div className="ml-auto flex items-center gap-1.5 flex-wrap">
          <Button size="sm" variant={preview ? 'subtle' : 'ghost'} onClick={() => setPreview((v) => !v)}>
            <List className="w-3.5 h-3.5" /> {preview ? 'Edit' : 'Preview'}
          </Button>
          <Button size="sm" variant="ghost" onClick={() => patch({ favorite: !note.favorite })}>
            <Star className={cn('w-4 h-4', note.favorite && 'fill-accent2 text-accent2')} />
          </Button>
          <Button size="sm" variant="subtle" onClick={() => openAi('summarize', { noteId: note.id })}>
            <Sparkles className="w-3.5 h-3.5 text-accent2" /> Summarize
          </Button>
          <Button size="sm" variant="subtle" onClick={() => openAi('flashcards', { noteId: note.id })}>
            <Layers className="w-3.5 h-3.5 text-accent" /> Make flashcards
          </Button>
          <Button
            size="sm" variant="ghost" className="text-danger hover:bg-danger/10"
            onClick={() => { if (confirm('Delete this note permanently?')) { deleteNote(note.id); onBack(); toast.info('Note deleted') } }}
          >
            <Trash2 className="w-4 h-4" />
          </Button>
        </div>
      </div>

      <div className="grid lg:grid-cols-[1fr_230px] gap-4 items-start">
        <Card className="overflow-hidden">
          <input
            value={note.title}
            onChange={(e) => patch({ title: e.target.value })}
            placeholder="Untitled note"
            className="w-full font-display font-semibold text-[22px] px-5 pt-4 pb-3 bg-transparent outline-none border-b border-line/60"
            aria-label="Note title"
          />
          {/* mini formatting bar */}
          {!preview && (
            <div className="flex items-center gap-0.5 px-3 py-1.5 border-b border-line/50 bg-surface2/40">
              <FmtBtn label="Bold" onClick={() => wrapSelection('**')}><Bold className="w-3.5 h-3.5" /></FmtBtn>
              <FmtBtn label="Highlight" onClick={() => wrapSelection('==')}><Highlighter className="w-3.5 h-3.5" /></FmtBtn>
              <FmtBtn label="Heading" onClick={() => prefixLines('## ')}><span className="font-display font-bold text-[12px]">H2</span></FmtBtn>
              <FmtBtn label="Bullets" onClick={() => prefixLines('- ')}><List className="w-3.5 h-3.5" /></FmtBtn>
              <div className="ml-auto text-[11px] text-ink3 pr-2">{plural(words, 'word')}</div>
            </div>
          )}
          {preview ? (
            <div className="note-content px-6 py-5 min-h-[420px] text-[14px] leading-relaxed" dangerouslySetInnerHTML={{ __html: mdLite(note.content) }} />
          ) : (
            <textarea
              ref={taRef}
              value={note.content}
              onChange={(e) => patch({ content: e.target.value })}
              placeholder="Start writing… Definitions and full sentences make the best flashcards later."
              className="paper w-full min-h-[420px] px-6 py-5 bg-transparent outline-none resize-y text-[14px] leading-[28px]"
            />
          )}
        </Card>

        {/* meta panel */}
        <div className="space-y-3">
          <Card className="p-4 space-y-3">
            <div>
              <label className="text-[11px] font-semibold text-ink3 uppercase tracking-wide">Folder</label>
              <Select value={note.folderId ?? ''} onChange={(e) => patch({ folderId: e.target.value || null })} className="w-full mt-1">
                <option value="">No folder</option>
                {folders.map((f) => <option key={f.id} value={f.id}>{f.name}</option>)}
              </Select>
            </div>
            <div>
              <label className="text-[11px] font-semibold text-ink3 uppercase tracking-wide">Color</label>
              <div className="flex gap-1.5 mt-1.5">
                {['#3f7d58', '#c2703e', '#5b7fb0', '#a35d8a', '#96762f', '#5d8a83'].map((c) => (
                  <button key={c} onClick={() => patch({ color: c })} className={cn('w-6 h-6 rounded-full', note.color === c && 'ring-2 ring-offset-2 ring-ink/40 dark:ring-surface')} style={{ backgroundColor: c }} aria-label={c} />
                ))}
              </div>
            </div>
            <div>
              <label className="text-[11px] font-semibold text-ink3 uppercase tracking-wide">Tags</label>
              <div className="flex flex-wrap gap-1 mt-1.5">
                {note.tags.map((t) => (
                  <Chip key={t}>
                    {t}
                    <button onClick={() => patch({ tags: note.tags.filter((x) => x !== t) })} aria-label={`Remove ${t}`}>×</button>
                  </Chip>
                ))}
              </div>
              <Input
                value={tagInput}
                onChange={(e) => setTagInput(e.target.value)}
                onKeyDown={(e) => {
                  if ((e.key === 'Enter' || e.key === ',') && tagInput.trim()) {
                    e.preventDefault()
                    if (!note.tags.includes(tagInput.trim())) patch({ tags: [...note.tags, tagInput.trim()] })
                    setTagInput('')
                  }
                }}
                placeholder="+ tag"
                className="mt-2 h-8 text-[12px]"
              />
            </div>
          </Card>
          <Card className="p-4">
            <div className="text-[11px] font-semibold text-ink3 uppercase tracking-wide mb-2">Wisely can</div>
            <ul className="space-y-2 text-[12.5px] text-ink2">
              <li className="flex gap-2"><Sparkles className="w-3.5 h-3.5 text-accent2 shrink-0 mt-0.5" /> Summarize this into 4 bullets</li>
              <li className="flex gap-2"><Layers className="w-3.5 h-3.5 text-accent shrink-0 mt-0.5" /> Turn definitions & dates into flashcards</li>
              <li className="flex gap-2"><BookOpen className="w-3.5 h-3.5 text-violet shrink-0 mt-0.5" /> Answer questions using this note</li>
            </ul>
          </Card>
        </div>
      </div>
    </div>
  )
}

function FmtBtn({ children, onClick, label }: { children: React.ReactNode; onClick: () => void; label: string }) {
  return (
    <button onClick={onClick} title={label} aria-label={label} className="p-1.5 rounded-lg text-ink2 hover:bg-surface3 hover:text-ink transition-colors">
      {children}
    </button>
  )
}

/* --------------------------------- Decks -------------------------------- */
function DecksGrid({ query, onOpen }: { query: string; onOpen: (id: string) => void }) {
  const { decks, cards, createDeck } = useLibrary()
  const [creating, setCreating] = useState(false)
  const [title, setTitle] = useState('')
  const shown = useMemo(() => {
    let list = [...decks].sort((a, b) => b.createdAt - a.createdAt)
    if (query.trim()) list = list.filter((d) => (d.title + d.description).toLowerCase().includes(query.toLowerCase()))
    return list
  }, [decks, query])

  return (
    <div className="grid sm:grid-cols-2 xl:grid-cols-3 gap-3.5">
      {shown.map((d, i) => {
        const total = cardsOfDeck(cards, d.id).length
        const due = dueOfDeck(cards, d.id).length
        const mastery = masteryOf(cards, d.id)
        return (
          <motion.button
            key={d.id}
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: Math.min(i * 0.03, 0.2) }}
            onClick={() => onOpen(d.id)}
            className="text-left"
          >
            <Card className="p-4 hover:shadow-lift hover:border-ink3/40 transition-all h-[150px] flex flex-col">
              <div className="flex items-start gap-3">
                <span className="grid place-items-center w-10 h-10 rounded-xl shrink-0" style={{ backgroundColor: d.color + '22', color: d.color }}>
                  <Layers className="w-5 h-5" />
                </span>
                <div className="min-w-0 flex-1">
                  <h3 className="font-display font-semibold text-[14.5px] leading-snug line-clamp-1">{d.title}</h3>
                  <p className="text-[11.5px] text-ink3 line-clamp-1 mt-0.5">{d.description || 'No description'}</p>
                </div>
                {due > 0 && <Chip color="#c2703e">{due} due</Chip>}
              </div>
              <div className="mt-auto">
                <div className="flex justify-between text-[11px] text-ink3 mb-1">
                  <span>{plural(total, 'card')}</span>
                  <span>{mastery}% mastered</span>
                </div>
                <ProgressBar value={mastery} color={d.color} />
              </div>
            </Card>
          </motion.button>
        )
      })}

      <button
        onClick={() => setCreating(true)}
        className="min-h-[150px] rounded-2xl border-2 border-dashed border-line hover:border-accent/50 hover:bg-accent/5 transition-all grid place-items-center text-ink3 hover:text-accent"
      >
        <span className="flex flex-col items-center gap-2">
          <Plus className="w-5 h-5" />
          <span className="text-sm font-medium">New deck</span>
        </span>
      </button>

      <Modal open={creating} onClose={() => setCreating(false)}>
        <div className="p-6">
          <h2 className="font-display text-xl font-semibold mb-4">New flashcard deck</h2>
          <Input value={title} onChange={(e) => setTitle(e.target.value)} placeholder="e.g. French — food vocab" autoFocus onKeyDown={(e) => { if (e.key === 'Enter' && title.trim()) { const id = createDeck(title.trim()); setCreating(false); setTitle(''); onOpen(id) } }} />
          <div className="flex justify-end gap-2 mt-5">
            <Button variant="ghost" onClick={() => setCreating(false)}>Cancel</Button>
            <Button disabled={!title.trim()} onClick={() => { const id = createDeck(title.trim()); setCreating(false); setTitle(''); onOpen(id) }}>Create deck</Button>
          </div>
        </div>
      </Modal>
    </div>
  )
}

/* ------------------------------ Deck detail ----------------------------- */
function DeckDetail({ deckId, onBack }: { deckId: string; onBack: () => void }) {
  const { decks, cards, updateDeck, deleteDeck, addCards, deleteCard, updateCard } = useLibrary()
  const { openAi } = useUi()
  const deck = decks.find((d) => d.id === deckId)
  const [studying, setStudying] = useState(false)
  const [editing, setEditing] = useState(false)
  const [front, setFront] = useState('')
  const [back, setBack] = useState('')
  const [editCard, setEditCard] = useState<Flashcard | null>(null)

  if (!deck) {
    return (
      <div className="text-center py-16 text-ink3">
        Deck not found. <button onClick={onBack} className="text-accent hover:underline">Back to decks</button>
      </div>
    )
  }

  const deckCards = cardsOfDeck(cards, deck.id)
  const due = dueOfDeck(cards, deck.id)
  const mastery = masteryOf(cards, deck.id)

  const addCard = () => {
    if (!front.trim() || !back.trim()) return
    addCards(deck.id, [{ front: front.trim(), back: back.trim() }])
    setFront(''); setBack('')
  }

  return (
    <div>
      <div className="flex flex-wrap items-start gap-3 mb-5">
        <button onClick={onBack} className="p-2 rounded-xl text-ink3 hover:bg-surface2 hover:text-ink transition-colors" aria-label="Back">
          <ArrowLeft className="w-[18px] h-[18px]" />
        </button>
        <span className="grid place-items-center w-11 h-11 rounded-xl shrink-0" style={{ backgroundColor: deck.color + '22', color: deck.color }}>
          <Layers className="w-5 h-5" />
        </span>
        <div className="min-w-0 flex-1">
          {editing ? (
            <Input value={deck.title} autoFocus onChange={(e) => updateDeck(deck.id, { title: e.target.value })} onBlur={() => setEditing(false)} onKeyDown={(e) => e.key === 'Enter' && setEditing(false)} className="max-w-sm" />
          ) : (
            <button onClick={() => setEditing(true)} className="font-display font-semibold text-[22px] tracking-tight hover:underline decoration-dotted" title="Rename deck">
              {deck.title}
            </button>
          )}
          <div className="text-[13px] text-ink3 mt-0.5">
            {plural(deckCards.length, 'card')} · {mastery}% mastered{due.length > 0 ? ` · ${due.length} due` : ''}
          </div>
        </div>
        <div className="flex items-center gap-1.5 flex-wrap">
          <Button size="sm" variant="subtle" onClick={() => openAi('quiz', { deckId: deck.id })}>
            <Sparkles className="w-3.5 h-3.5 text-accent2" /> Quiz me
          </Button>
          <Button
            size="sm" variant="ghost" className="text-danger hover:bg-danger/10"
            onClick={() => { if (confirm(`Delete deck “${deck.title}” and all its cards?`)) { deleteDeck(deck.id); onBack() } }}
          >
            <Trash2 className="w-4 h-4" />
          </Button>
          <Button onClick={() => setStudying(true)} disabled={deckCards.length === 0}>
            <RotateCcw className="w-4 h-4" /> Study{due.length > 0 ? ` (${due.length})` : ''}
          </Button>
        </div>
      </div>

      <div className="grid lg:grid-cols-[1fr_300px] gap-4 items-start">
        {/* card list */}
        <Card>
          <div className="grid grid-cols-[1fr_1fr_auto] gap-x-3 px-4 py-2.5 border-b border-line/70 text-[10.5px] font-semibold uppercase tracking-wide text-ink3">
            <span>Front</span><span>Back</span><span>Due</span>
          </div>
          <div className="divide-y divide-line/50">
            {deckCards.map((c) => (
              <button
                key={c.id}
                onClick={() => setEditCard(c)}
                className="w-full grid grid-cols-[1fr_1fr_auto] gap-x-3 px-4 py-3 text-left hover:bg-surface2/60 transition-colors group"
              >
                <span className="text-[13px] font-medium leading-snug line-clamp-2">{c.front}</span>
                <span className="text-[12.5px] text-ink2 leading-snug line-clamp-2">{c.back}</span>
                <span className="text-[11px] text-ink3 text-right whitespace-nowrap pt-0.5">
                  {c.due <= Date.now() ? <span className="text-accent2 font-semibold">due now</span> : timeAgo(c.due).replace(' ago', '')}
                </span>
              </button>
            ))}
            {deckCards.length === 0 && (
              <EmptyState
                icon={<Layers className="w-9 h-9" />}
                title="No cards yet"
                desc="Add cards below, or let Wisely draft them from one of your notes."
                action={<Button size="sm" variant="subtle" onClick={() => openAi('flashcards')}><Sparkles className="w-3.5 h-3.5" /> Generate from a note</Button>}
              />
            )}
          </div>
        </Card>

        {/* add card form */}
        <Card className="p-4 sticky top-20">
          <div className="text-[11px] font-semibold text-ink3 uppercase tracking-wide mb-2">Add a card</div>
          <Textarea value={front} onChange={(e) => setFront(e.target.value)} placeholder="Front — the question" className="min-h-[64px] text-[13px]" />
          <Textarea value={back} onChange={(e) => setBack(e.target.value)} placeholder="Back — the answer" className="min-h-[64px] text-[13px] mt-2" onKeyDown={(e) => { if (e.key === 'Enter' && (e.metaKey || e.ctrlKey)) addCard() }} />
          <Button onClick={addCard} disabled={!front.trim() || !back.trim()} className="w-full mt-2.5" size="sm">
            <Plus className="w-3.5 h-3.5" /> Add card
          </Button>
        </Card>
      </div>

      {/* study modal */}
      <StudyModal deck={deck} open={studying} onClose={() => setStudying(false)} />

      {/* edit card modal */}
      <Modal open={!!editCard} onClose={() => setEditCard(null)}>
        {editCard && (
          <div className="p-6 space-y-3">
            <h2 className="font-display text-lg font-semibold">Edit card</h2>
            <Textarea value={editCard.front} onChange={(e) => { updateCard(editCard.id, { front: e.target.value }); setEditCard({ ...editCard, front: e.target.value }) }} className="min-h-[70px]" />
            <Textarea value={editCard.back} onChange={(e) => { updateCard(editCard.id, { back: e.target.value }); setEditCard({ ...editCard, back: e.target.value }) }} className="min-h-[70px]" />
            <div className="flex justify-between pt-2">
              <Button variant="danger" size="sm" onClick={() => { deleteCard(editCard.id); setEditCard(null) }}>
                <Trash2 className="w-3.5 h-3.5" /> Delete
              </Button>
              <Button size="sm" onClick={() => setEditCard(null)}>Done</Button>
            </div>
          </div>
        )}
      </Modal>
    </div>
  )
}

/* ------------------------------ Study mode ------------------------------ */
function StudyModal({ deck, open, onClose }: { deck: Deck; open: boolean; onClose: () => void }) {
  const { cards, reviewCard } = useLibrary()
  const [queue, setQueue] = useState<Flashcard[]>([])
  const [flipped, setFlipped] = useState(false)
  const [done, setDone] = useState(0)
  const [sessionId, setSessionId] = useState(0)

  useEffect(() => {
    if (open) {
      const due = dueOfDeck(cards, deck.id)
      // also allow reviewing ahead when nothing is due
      const pool = due.length > 0 ? due : cardsOfDeck(cards, deck.id)
      setQueue([...pool].sort(() => Math.random() - 0.5))
      setFlipped(false)
      setDone(0)
      setSessionId((s) => s + 1)
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open])

  const current = queue[0]

  const rate = (r: Rating) => {
    if (!current) return
    reviewCard(current.id, r)
    setQueue((q) => (r === 'again' ? [...q.slice(1), current] : q.slice(1)))
    setDone((d) => d + (r === 'again' ? 0 : 1))
    setFlipped(false)
  }

  useEffect(() => {
    if (!open) return
    const onKey = (e: KeyboardEvent) => {
      if (e.key === ' ') { e.preventDefault(); setFlipped((f) => !f) }
      if (flipped && ['1', '2', '3', '4'].includes(e.key)) {
        rate(['again', 'hard', 'good', 'easy'][Number(e.key) - 1] as Rating)
      }
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  })

  const total = done + queue.length

  return (
    <Modal open={open} onClose={onClose} wide>
      <div className="p-5 sm:p-7">
        <div className="flex items-center gap-3 mb-5 pr-8">
          <span className="grid place-items-center w-9 h-9 rounded-xl shrink-0" style={{ backgroundColor: deck.color + '22', color: deck.color }}>
            <Layers className="w-4.5 h-4.5 w-[18px] h-[18px]" />
          </span>
          <div className="min-w-0">
            <div className="font-display font-semibold text-[16px] truncate">{deck.title}</div>
            <div className="text-[11.5px] text-ink3">Spaced repetition · ratings reschedule each card · Space to flip, 1–4 to rate</div>
          </div>
          <div className="ml-auto text-[12px] text-ink3 shrink-0">{done} done · {queue.length} left</div>
        </div>
        <ProgressBar value={total === 0 ? 100 : (done / Math.max(1, total)) * 100} color={deck.color} className="mb-6" />

        {!current ? (
          <div className="text-center py-10">
            <Pin className="w-8 h-8 mx-auto text-ok rotate-45" />
            <div className="font-display font-semibold text-xl mt-3">Session complete</div>
            <div className="text-sm text-ink3 mt-1">You reviewed {done} cards. Next due dates are set based on your ratings.</div>
            <div className="font-hand text-2xl text-accent mt-2">memory: reinforced ✓</div>
            <Button onClick={onClose} className="mt-5">Back to deck</Button>
          </div>
        ) : (
          <>
            {/* flip card */}
            <button className="flip-scene w-full block" onClick={() => setFlipped((f) => !f)} aria-label="Flip card">
              <div className={cn('flip-inner relative w-full h-[240px] sm:h-[280px]', flipped && 'flipped')} key={current.id + sessionId}>
                <div className="flip-face absolute inset-0 rounded-2xl border border-line bg-surface shadow-card grid place-items-center p-6">
                  <div>
                    <div className="text-[10.5px] font-semibold uppercase tracking-[0.14em] text-ink3 mb-3">Front</div>
                    <div className="font-display text-[19px] sm:text-[22px] font-medium leading-snug text-center">{current.front}</div>
                    <div className="text-[11px] text-ink3 mt-4 text-center">tap to reveal</div>
                  </div>
                </div>
                <div className="flip-face flip-back absolute inset-0 rounded-2xl border border-accent/40 bg-accent/5 grid place-items-center p-6">
                  <div>
                    <div className="text-[10.5px] font-semibold uppercase tracking-[0.14em] text-accent mb-3">Back</div>
                    <div className="font-display text-[17px] sm:text-[19px] font-medium leading-snug text-center">{current.back}</div>
                  </div>
                </div>
              </div>
            </button>

            {/* rating bar */}
            <div className={cn('grid grid-cols-4 gap-2 mt-5 transition-opacity', flipped ? 'opacity-100' : 'opacity-30 pointer-events-none')}>
              {(
                [
                  { r: 'again', label: 'Again', hint: '10 min', cls: 'border-danger/40 text-danger hover:bg-danger/10' },
                  { r: 'hard', label: 'Hard', hint: `${Math.max(1, Math.round(current.interval * 1.2))}d`, cls: 'border-warn/40 text-warn hover:bg-warn/10' },
                  { r: 'good', label: 'Good', hint: `${current.interval < 1 ? 1 : Math.round(current.interval * current.ease)}d`, cls: 'border-ok/40 text-ok hover:bg-ok/10' },
                  { r: 'easy', label: 'Easy', hint: `${Math.max(1, Math.round(current.interval * current.ease * 1.4))}d`, cls: 'border-accent/50 text-accent hover:bg-accent/10' },
                ] as const
              ).map((o) => (
                <button
                  key={o.r}
                  onClick={() => rate(o.r)}
                  className={cn('rounded-xl border px-2 py-2.5 text-center transition-colors bg-surface', o.cls)}
                >
                  <div className="text-[13px] font-semibold">{o.label}</div>
                  <div className="text-[10.5px] opacity-80">{o.hint}</div>
                </button>
              ))}
            </div>
          </>
        )}
      </div>
    </Modal>
  )
}

/* --------------------------------- Files -------------------------------- */
function FilesPane({ query, filter }: { query: string; filter: string }) {
  const { files, folders, addFile, deleteFile } = useLibrary()

  const handleFiles = (list: FileList | null) => {
    if (!list) return
    Array.from(list).forEach((f) => {
      if (f.size > 1_400_000) {
        // keep metadata only — localStorage is precious
        addFile({ name: f.name, mime: f.type || 'application/octet-stream', size: f.size, folderId: targetFolder() })
        toast.info('File registered', `“${f.name}” is over 1.4 MB, so only its record is stored locally.`)
      } else {
        const reader = new FileReader()
        reader.onload = () => {
          addFile({ name: f.name, mime: f.type || 'application/octet-stream', size: f.size, dataUrl: String(reader.result), folderId: targetFolder() })
          toast.success('File stored locally', f.name)
        }
        reader.readAsDataURL(f)
      }
    })
  }

  const targetFolder = () => (filter === 'all' || filter === 'fav' ? null : filter)

  const shown = useMemo(() => {
    let list = [...files].sort((a, b) => b.createdAt - a.createdAt)
    if (filter !== 'all' && filter !== 'fav') list = list.filter((f) => f.folderId === filter)
    if (query.trim()) list = list.filter((f) => f.name.toLowerCase().includes(query.toLowerCase()))
    return list
  }, [files, query, filter])

  return (
    <div>
      <input
        id="lib-file-input"
        type="file"
        multiple
        className="hidden"
        onChange={(e) => handleFiles(e.target.files)}
      />
      <Card>
        {shown.length === 0 ? (
          <EmptyState
            icon={<FileUp className="w-10 h-10" />}
            title="No files yet"
            desc="Drop in syllabi, scans and slides. Small files (≤ 1.4 MB) are stored fully offline in your workspace."
            action={
              <div>
                <Button size="sm" onClick={() => document.getElementById('lib-file-input')?.click()}>
                  <Upload className="w-3.5 h-3.5" /> Upload files
                </Button>
                <button
                  onClick={() => document.getElementById('lib-file-input')?.click()}
                  onDragOver={(e) => e.preventDefault()}
                  onDrop={(e) => { e.preventDefault(); handleFiles(e.dataTransfer.files) }}
                  className="mt-3 w-72 max-w-full rounded-xl border-2 border-dashed border-line px-4 py-6 text-[12.5px] text-ink3 hover:border-accent/50 hover:text-accent transition-colors"
                >
                  …or drag files here
                </button>
              </div>
            }
          />
        ) : (
          <div className="divide-y divide-line/50">
            {shown.map((f) => {
              const folder = folders.find((x) => x.id === f.folderId)
              return (
                <div key={f.id} className="flex items-center gap-3 px-4 py-3 group">
                  <span className="grid place-items-center w-9 h-9 rounded-xl bg-surface2 text-ink2 shrink-0">
                    <FileText className="w-4 h-4" />
                  </span>
                  <div className="min-w-0 flex-1">
                    <div className="text-[13px] font-medium truncate">{f.name}</div>
                    <div className="text-[11px] text-ink3">
                      {(f.size / 1024).toFixed(0)} KB{f.dataUrl ? ' · stored offline' : ' · record only'}
                      {folder && <> · <Folder className="w-3 h-3 inline" style={{ color: folder.color }} /> {folder.name}</>}
                      {' · '}{timeAgo(f.createdAt)}
                    </div>
                  </div>
                  {f.dataUrl && (
                    <a href={f.dataUrl} download={f.name} className="p-2 rounded-lg text-ink3 hover:text-ink hover:bg-surface2" aria-label="Download">
                      <Download className="w-4 h-4" />
                    </a>
                  )}
                  <button
                    onClick={() => { if (confirm(`Remove “${f.name}”?`)) deleteFile(f.id) }}
                    className="p-2 rounded-lg text-ink3 hover:text-danger hover:bg-danger/10 opacity-0 group-hover:opacity-100 transition-all"
                    aria-label="Delete file"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              )
            })}
          </div>
        )}
      </Card>
      {shown.length > 0 && (
        <Button variant="subtle" className="mt-3" onClick={() => document.getElementById('lib-file-input')?.click()}>
          <Plus className="w-4 h-4" /> Add files
        </Button>
      )}
    </div>
  )
}
