import { useMemo, useState } from 'react'
import { Link, useNavigate, useParams } from 'react-router-dom'
import { AnimatePresence, motion } from 'framer-motion'
import {
  ArrowLeft, CalendarDays, Check, CheckCircle2, Circle, GripVertical, Link2, Plus,
  Star, Trash2, X,
} from 'lucide-react'
import { Button, Chip, Input, Modal, Select, Textarea } from '../components/ui'
import { DynIcon } from '../components/icons'
import { useBoards } from '../stores/boards'
import { useLibrary } from '../stores/library'
import type { Board, BoardCard } from '../lib/types'
import { cn, timeAgo } from '../lib/utils'
import { shortDate, todayKey } from '../lib/dates'
import { toast } from '../stores/toast'

type DropLoc = { columnId: string; index: number }

export default function BoardDetail() {
  const { boardId } = useParams()
  const navigate = useNavigate()
  const { boards, updateBoard, deleteBoard, addColumn, renameColumn, removeColumn, addCard, moveCard, toggleDone, updateCard, removeCard } = useBoards()
  const board = boards.find((b) => b.id === boardId)

  const [activeCard, setActiveCard] = useState<BoardCard | null>(null)
  const [dropLoc, setDropLoc] = useState<DropLoc | null>(null)
  const [dragId, setDragId] = useState<string | null>(null)
  const [addingCol, setAddingCol] = useState(false)
  const [colTitle, setColTitle] = useState('')
  const [newCardCol, setNewCardCol] = useState<string | null>(null)
  const [newCardTitle, setNewCardTitle] = useState('')
  const [editingCol, setEditingCol] = useState<string | null>(null)

  if (!board) {
    return (
      <div className="p-10 text-center">
        <p className="text-ink3">Board not found.</p>
        <Link to="/boards" className="text-accent hover:underline text-sm">← Back to boards</Link>
      </div>
    )
  }

  const cardsIn = (colId: string) => board.cards.filter((c) => c.columnId === colId)

  const submitNewCard = (colId: string) => {
    if (newCardTitle.trim()) {
      const id = addCard(board.id, colId, newCardTitle.trim())
      setNewCardTitle('')
      const created = useBoards.getState().boards.find((b) => b.id === board.id)?.cards.find((c) => c.id === id)
      if (created) setActiveCard(created)
    } else {
      setNewCardCol(null)
    }
  }

  const onDrop = (colId: string, index: number) => {
    if (dragId) moveCard(board.id, dragId, colId, index)
    setDragId(null)
    setDropLoc(null)
  }

  return (
    <div className="h-full flex flex-col animate-fade-up">
      {/* header */}
      <div className="px-4 sm:px-6 lg:px-8 pt-5 pb-4 border-b border-line/60 bg-bg/60 backdrop-blur sticky top-14 z-20">
        <div className="max-w-[1400px] mx-auto flex flex-wrap items-center gap-3">
          <button onClick={() => navigate('/boards')} className="p-2 rounded-xl text-ink3 hover:bg-surface2 hover:text-ink transition-colors" aria-label="Back">
            <ArrowLeft className="w-4.5 h-4.5 w-[18px] h-[18px]" />
          </button>
          <span className="grid place-items-center w-9 h-9 rounded-xl shrink-0" style={{ backgroundColor: board.color + '22', color: board.color }}>
            <DynIcon name={board.icon} className="w-4.5 h-4.5 w-[18px] h-[18px]" />
          </span>
          <input
            value={board.title}
            onChange={(e) => updateBoard(board.id, { title: e.target.value })}
            className="font-display font-semibold text-xl bg-transparent outline-none border-b border-transparent focus:border-accent/60 px-0.5 min-w-[120px] max-w-[340px]"
            aria-label="Board title"
          />
          <div className="text-[12px] text-ink3 hidden sm:block">
            {board.cards.filter((c) => c.done).length}/{board.cards.length} done · edited {timeAgo(board.updatedAt)}
          </div>
          <div className="ml-auto flex items-center gap-1">
            <Button variant="ghost" size="sm" onClick={() => updateBoard(board.id, { favorite: !board.favorite })}>
              <Star className={cn('w-4 h-4', board.favorite && 'fill-accent2 text-accent2')} />
            </Button>
            <Button
              variant="ghost" size="sm"
              className="text-danger hover:bg-danger/10"
              onClick={() => { if (confirm(`Delete “${board.title}”?`)) { deleteBoard(board.id); navigate('/boards'); toast.info('Board deleted') } }}
            >
              <Trash2 className="w-4 h-4" />
            </Button>
          </div>
        </div>
      </div>

      {/* columns */}
      <div className="flex-1 overflow-x-auto">
        <div className="max-w-[1400px] mx-auto px-4 sm:px-6 lg:px-8 py-5 flex items-start gap-4 min-h-full">
          {board.columns.map((col) => {
            const colCards = cardsIn(col.id)
            return (
              <section
                key={col.id}
                className="w-[280px] shrink-0 rounded-2xl bg-surface/60 border border-line/70 flex flex-col max-h-[calc(100vh-190px)]"
                onDragOver={(e) => {
                  e.preventDefault()
                  if (dropLoc?.columnId !== col.id) setDropLoc({ columnId: col.id, index: colCards.length })
                }}
                onDrop={(e) => { e.preventDefault(); onDrop(col.id, dropLoc?.index ?? colCards.length) }}
              >
                {/* column header */}
                <header className="flex items-center gap-1.5 px-3 pt-3 pb-2">
                  {editingCol === col.id ? (
                    <Input
                      autoFocus
                      defaultValue={col.title}
                      className="h-7 text-[13px]"
                      onBlur={(e) => { renameColumn(board.id, col.id, e.target.value.trim() || col.title); setEditingCol(null) }}
                      onKeyDown={(e) => {
                        if (e.key === 'Enter') (e.target as HTMLInputElement).blur()
                        if (e.key === 'Escape') setEditingCol(null)
                      }}
                    />
                  ) : (
                    <button
                      className="font-semibold text-[13px] px-1 rounded hover:bg-surface2"
                      onClick={() => setEditingCol(col.id)}
                      title="Rename column"
                    >
                      {col.title}
                    </button>
                  )}
                  <span className="text-[11px] text-ink3 bg-surface2 rounded-full px-1.5 py-0.5 font-semibold">{colCards.length}</span>
                  <button
                    className="ml-auto p-1 rounded-md text-ink3 hover:text-danger hover:bg-danger/10 opacity-60 hover:opacity-100 transition-all"
                    onClick={() => { if (confirm(`Delete column “${col.title}” and its cards?`)) removeColumn(board.id, col.id) }}
                    aria-label="Delete column"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                </header>

                {/* cards */}
                <div className="flex-1 overflow-y-auto px-2.5 pb-2 space-y-2">
                  {colCards.map((card, idx) => (
                    <div key={card.id}>
                      {dropLoc?.columnId === col.id && dropLoc.index === idx && dragId && dragId !== card.id && (
                        <div className="h-1 rounded-full bg-accent/60 mb-2" />
                      )}
                      <article
                        draggable
                        onDragStart={(e) => {
                          setDragId(card.id)
                          e.dataTransfer.setData('text/plain', card.id)
                          e.dataTransfer.effectAllowed = 'move'
                        }}
                        onDragEnd={() => { setDragId(null); setDropLoc(null) }}
                        onDragOver={(e) => {
                          e.preventDefault()
                          e.stopPropagation()
                          setDropLoc({ columnId: col.id, index: idx })
                        }}
                        onDrop={(e) => { e.preventDefault(); e.stopPropagation(); onDrop(col.id, idx) }}
                        onClick={() => setActiveCard(card)}
                        className={cn(
                          'group bg-surface border border-line/70 rounded-xl p-3 cursor-grab active:cursor-grabbing shadow-card hover:shadow-lift hover:border-ink3/40 transition-all',
                          dragId === card.id && 'opacity-40 rotate-2',
                          card.done && 'opacity-70',
                        )}
                      >
                        <div className="flex items-start gap-1.5">
                          <button
                            onClick={(e) => { e.stopPropagation(); toggleDone(board.id, card.id) }}
                            className={cn('mt-0.5 shrink-0 transition-colors', card.done ? 'text-ok' : 'text-ink3 hover:text-accent')}
                            aria-label={card.done ? 'Mark as not done' : 'Mark as done'}
                          >
                            {card.done ? <CheckCircle2 className="w-[18px] h-[18px]" /> : <Circle className="w-[18px] h-[18px]" />}
                          </button>
                          <div className="min-w-0 flex-1">
                            <div className={cn('text-[13px] font-medium leading-snug', card.done && 'line-through text-ink3')}>
                              {card.title}
                            </div>
                            <div className="flex flex-wrap items-center gap-1 mt-1.5">
                              {card.due && (
                                <Chip color={card.due <= todayKey() && !card.done ? '#c23d2e' : undefined}>
                                  <CalendarDays className="w-3 h-3" /> {shortDate(card.due)}
                                </Chip>
                              )}
                              {card.priority === 'high' && !card.done && <Chip color="#c23d2e">high</Chip>}
                              {card.tags.map((t) => <Chip key={t}>{t}</Chip>)}
                              {card.note && <span className="text-[10px] text-ink3">≡</span>}
                              {card.linkedNoteId && <Link2 className="w-3 h-3 text-accent" />}
                            </div>
                          </div>
                          <GripVertical className="w-3.5 h-3.5 text-ink3/50 shrink-0 opacity-0 group-hover:opacity-100 transition-opacity" />
                        </div>
                      </article>
                    </div>
                  ))}
                  {dropLoc?.columnId === col.id && dropLoc.index >= colCards.length && dragId && (
                    <div className="h-1 rounded-full bg-accent/60" />
                  )}

                  {/* add card */}
                  {newCardCol === col.id ? (
                    <div className="bg-surface border border-accent/50 rounded-xl p-2.5">
                      <Textarea
                        autoFocus
                        value={newCardTitle}
                        onChange={(e) => setNewCardTitle(e.target.value)}
                        onKeyDown={(e) => {
                          if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); submitNewCard(col.id) }
                          if (e.key === 'Escape') { setNewCardCol(null); setNewCardTitle('') }
                        }}
                        placeholder="Task title… (Enter to add)"
                        className="min-h-[54px] border-0 bg-transparent p-1 text-[13px] focus:ring-0"
                      />
                      <div className="flex gap-1.5">
                        <Button size="sm" onClick={() => submitNewCard(col.id)}>Add</Button>
                        <Button size="sm" variant="ghost" onClick={() => { setNewCardCol(null); setNewCardTitle('') }}>
                          <X className="w-3.5 h-3.5" />
                        </Button>
                      </div>
                    </div>
                  ) : (
                    <button
                      onClick={() => setNewCardCol(col.id)}
                      className="w-full flex items-center gap-1.5 px-2.5 py-2 rounded-xl text-[12.5px] font-medium text-ink3 hover:text-ink hover:bg-surface2 transition-colors"
                    >
                      <Plus className="w-3.5 h-3.5" /> Add card
                    </button>
                  )}
                </div>
              </section>
            )
          })}

          {/* add column */}
          {addingCol ? (
            <div className="w-[280px] shrink-0 rounded-2xl bg-surface border border-line p-3 space-y-2">
              <Input
                autoFocus
                value={colTitle}
                onChange={(e) => setColTitle(e.target.value)}
                placeholder="Column name"
                onKeyDown={(e) => {
                  if (e.key === 'Enter' && colTitle.trim()) { addColumn(board.id, colTitle.trim()); setColTitle(''); setAddingCol(false) }
                  if (e.key === 'Escape') setAddingCol(false)
                }}
              />
              <div className="flex gap-1.5">
                <Button
                  size="sm"
                  onClick={() => { if (colTitle.trim()) { addColumn(board.id, colTitle.trim()); setColTitle(''); setAddingCol(false) } }}
                >
                  Add column
                </Button>
                <Button size="sm" variant="ghost" onClick={() => setAddingCol(false)}>Cancel</Button>
              </div>
            </div>
          ) : (
            <button
              onClick={() => setAddingCol(true)}
              className="w-[280px] shrink-0 h-11 rounded-2xl border-2 border-dashed border-line text-ink3 hover:border-accent/50 hover:text-accent transition-colors flex items-center justify-center gap-1.5 text-[13px] font-medium"
            >
              <Plus className="w-4 h-4" /> Add column
            </button>
          )}
        </div>
      </div>

      {/* card modal */}
      <CardModal
        board={board}
        card={activeCard && board.cards.find((c) => c.id === activeCard.id) ? board.cards.find((c) => c.id === activeCard.id)! : null}
        onClose={() => setActiveCard(null)}
      />
    </div>
  )
}

function CardModal({ board, card, onClose }: { board: Board; card: BoardCard | null; onClose: () => void }) {
  const { updateCard, removeCard, toggleDone } = useBoards()
  const notes = useLibrary((s) => s.notes)
  const [tagInput, setTagInput] = useState('')
  const navigate = useNavigate()

  const linkedNote = useMemo(() => notes.find((n) => n.id === card?.linkedNoteId), [notes, card])
  if (!card) return <Modal open={false} onClose={onClose}>{null}</Modal>

  return (
    <Modal open={!!card} onClose={onClose}>
      <div className="p-6 space-y-4">
        <div className="flex items-start gap-3">
          <button
            onClick={() => toggleDone(board.id, card.id)}
            className={cn('mt-1 shrink-0', card.done ? 'text-ok' : 'text-ink3 hover:text-accent')}
          >
            {card.done ? <CheckCircle2 className="w-5 h-5" /> : <Circle className="w-5 h-5" />}
          </button>
          <Textarea
            value={card.title}
            onChange={(e) => updateCard(board.id, card.id, { title: e.target.value })}
            className="font-display font-semibold text-lg min-h-[52px] border-0 bg-transparent p-0 focus:ring-0 resize-none"
            aria-label="Card title"
          />
        </div>

        <div>
          <label className="text-[11px] font-semibold text-ink3 uppercase tracking-wide">Notes</label>
          <Textarea
            value={card.note ?? ''}
            onChange={(e) => updateCard(board.id, card.id, { note: e.target.value })}
            placeholder="Details, links, sub-steps…"
            className="mt-1.5 min-h-[90px] text-[13px]"
          />
        </div>

        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="text-[11px] font-semibold text-ink3 uppercase tracking-wide">Due date</label>
            <Input
              type="date"
              value={card.due ?? ''}
              onChange={(e) => updateCard(board.id, card.id, { due: e.target.value || undefined })}
              className="mt-1.5"
            />
          </div>
          <div>
            <label className="text-[11px] font-semibold text-ink3 uppercase tracking-wide">Priority</label>
            <Select
              value={card.priority ?? 'med'}
              onChange={(e) => updateCard(board.id, card.id, { priority: e.target.value as BoardCard['priority'] })}
              className="w-full mt-1.5"
            >
              <option value="low">Low</option>
              <option value="med">Medium</option>
              <option value="high">High</option>
            </Select>
          </div>
        </div>

        <div>
          <label className="text-[11px] font-semibold text-ink3 uppercase tracking-wide">Tags</label>
          <div className="flex flex-wrap items-center gap-1.5 mt-1.5">
            {card.tags.map((t) => (
              <Chip key={t}>
                {t}
                <button onClick={() => updateCard(board.id, card.id, { tags: card.tags.filter((x) => x !== t) })} aria-label={`Remove tag ${t}`}>
                  <X className="w-3 h-3" />
                </button>
              </Chip>
            ))}
            <Input
              value={tagInput}
              onChange={(e) => setTagInput(e.target.value)}
              onKeyDown={(e) => {
                if ((e.key === 'Enter' || e.key === ',') && tagInput.trim()) {
                  e.preventDefault()
                  if (!card.tags.includes(tagInput.trim())) updateCard(board.id, card.id, { tags: [...card.tags, tagInput.trim()] })
                  setTagInput('')
                }
              }}
              placeholder="+ add tag"
              className="h-7 w-24 text-[12px] px-2"
            />
          </div>
        </div>

        <div>
          <label className="text-[11px] font-semibold text-ink3 uppercase tracking-wide">Linked note</label>
          <Select
            value={card.linkedNoteId ?? ''}
            onChange={(e) => updateCard(board.id, card.id, { linkedNoteId: e.target.value || undefined })}
            className="w-full mt-1.5"
          >
            <option value="">None</option>
            {notes.map((n) => <option key={n.id} value={n.id}>{n.title}</option>)}
          </Select>
          {linkedNote && (
            <button
              onClick={() => { onClose(); navigate(`/library?note=${linkedNote.id}`) }}
              className="text-[12px] text-accent hover:underline mt-1.5 flex items-center gap-1"
            >
              <Link2 className="w-3 h-3" /> Open “{linkedNote.title}”
            </button>
          )}
        </div>

        <div className="flex items-center justify-between pt-2 border-t border-line/60">
          <Button
            variant="danger" size="sm"
            onClick={() => { if (confirm('Delete this card?')) { removeCard(board.id, card.id); onClose() } }}
          >
            <Trash2 className="w-3.5 h-3.5" /> Delete
          </Button>
          <div className="flex gap-2">
            {!card.done && (
              <Button variant="subtle" size="sm" onClick={() => toggleDone(board.id, card.id)}>
                <Check className="w-3.5 h-3.5" /> Mark done (+15 XP)
              </Button>
            )}
            <Button size="sm" onClick={onClose}>Close</Button>
          </div>
        </div>
      </div>
    </Modal>
  )
}
