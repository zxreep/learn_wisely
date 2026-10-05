import { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { motion } from 'framer-motion'
import { KanbanSquare, Plus, Star, Trash2 } from 'lucide-react'
import { Button, Card, EmptyState, Input, Modal, Page, PageHeader, ProgressBar, Select } from '../components/ui'
import { DynIcon } from '../components/icons'
import { useBoards } from '../stores/boards'
import { BOARD_TEMPLATES } from '../lib/templates'
import { plural, timeAgo, cn } from '../lib/utils'
import { toast } from '../stores/toast'

const BOARD_COLORS = ['#3f7d58', '#c2703e', '#5b7fb0', '#a35d8a', '#96762f', '#5d8a83', '#b05c5c']
const BOARD_ICONS = ['board', 'calendar', 'zap', 'microscope', 'languages', 'users', 'target', 'book', 'brain']

export default function Boards() {
  const { boards, createBoard, updateBoard, deleteBoard } = useBoards()
  const [newOpen, setNewOpen] = useState(false)
  const [title, setTitle] = useState('')
  const [color, setColor] = useState(BOARD_COLORS[0])
  const [icon, setIcon] = useState('board')
  const navigate = useNavigate()

  const create = () => {
    if (!title.trim()) return
    const id = createBoard(title.trim(), { color, icon })
    setNewOpen(false)
    setTitle('')
    toast.success('Board created', title.trim())
    navigate(`/boards/${id}`)
  }

  return (
    <Page>
      <PageHeader
        title="Study boards"
        subtitle="Customizable kanban-style boards for plans, sprints and projects."
        actions={
          <Button onClick={() => setNewOpen(true)}>
            <Plus className="w-4 h-4" /> New board
          </Button>
        }
      />

      {boards.length === 0 ? (
        <Card>
          <EmptyState
            icon={<KanbanSquare className="w-10 h-10" />}
            title="No boards yet"
            desc="Boards turn a big scary semester into columns of small, finishable moves."
            action={<Button onClick={() => setNewOpen(true)}><Plus className="w-4 h-4" /> Create your first board</Button>}
          />
        </Card>
      ) : (
        <div className="grid sm:grid-cols-2 xl:grid-cols-3 gap-4">
          {boards.map((b, i) => {
            const open = b.cards.filter((c) => !c.done).length
            const done = b.cards.length - open
            return (
              <motion.div key={b.id} initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.04 }}>
                <Card className="overflow-hidden group h-full flex flex-col">
                  <Link to={`/boards/${b.id}`} className="block p-4 pb-3 flex-1">
                    <div className="flex items-start gap-3">
                      <span className="grid place-items-center w-10 h-10 rounded-xl shrink-0" style={{ backgroundColor: b.color + '22', color: b.color }}>
                        <DynIcon name={b.icon} className="w-5 h-5" />
                      </span>
                      <div className="min-w-0 flex-1">
                        <div className="flex items-center gap-1.5">
                          <h3 className="font-display font-semibold text-[15.5px] truncate">{b.title}</h3>
                          {b.favorite && <Star className="w-3.5 h-3.5 fill-accent2 text-accent2 shrink-0" />}
                        </div>
                        <p className="text-[12px] text-ink3 mt-0.5 line-clamp-2 leading-snug min-h-[32px]">
                          {b.description || 'No description'}
                        </p>
                      </div>
                    </div>
                    <div className="flex items-center gap-3 mt-3 text-[11.5px] text-ink3">
                      <span>{plural(b.columns.length, 'column')}</span>
                      <span>·</span>
                      <span>{open} open · {done} done</span>
                      <span className="ml-auto">edited {timeAgo(b.updatedAt)}</span>
                    </div>
                    <ProgressBar value={(done / Math.max(1, b.cards.length)) * 100} color={b.color} className="mt-2.5" />
                  </Link>
                  <div className="px-3 py-2 border-t border-line/60 flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                    <Button size="sm" variant="ghost" onClick={() => updateBoard(b.id, { favorite: !b.favorite })}>
                      <Star className={cn('w-3.5 h-3.5', b.favorite && 'fill-accent2 text-accent2')} />
                      {b.favorite ? 'Unpin' : 'Pin'}
                    </Button>
                    <Button
                      size="sm" variant="ghost" className="text-danger hover:bg-danger/10 ml-auto"
                      onClick={() => { if (confirm(`Delete “${b.title}” and all its cards?`)) { deleteBoard(b.id); toast.info('Board deleted', b.title) } }}
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </Button>
                  </div>
                </Card>
              </motion.div>
            )
          })}

          {/* new board tile */}
          <button
            onClick={() => setNewOpen(true)}
            className="min-h-[170px] rounded-2xl border-2 border-dashed border-line hover:border-accent/50 hover:bg-accent/5 transition-all grid place-items-center text-ink3 hover:text-accent"
          >
            <span className="flex flex-col items-center gap-2">
              <Plus className="w-6 h-6" />
              <span className="text-sm font-medium">New board</span>
            </span>
          </button>
        </div>
      )}

      {/* templates teaser */}
      <div className="mt-8">
        <SectionRow />
        <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-3 mt-3">
          {BOARD_TEMPLATES.slice(0, 3).map((t) => (
            <Link to="/discover" key={t.id}>
              <Card className="p-4 flex items-center gap-3 hover:shadow-lift transition-shadow">
                <span className="grid place-items-center w-9 h-9 rounded-xl shrink-0" style={{ backgroundColor: t.color + '22', color: t.color }}>
                  <DynIcon name={t.icon} className="w-4.5 h-4.5 w-[18px] h-[18px]" />
                </span>
                <div className="min-w-0">
                  <div className="text-[13.5px] font-semibold truncate">{t.title}</div>
                  <div className="text-[11.5px] text-ink3 truncate">{t.columns.join(' → ')}</div>
                </div>
              </Card>
            </Link>
          ))}
        </div>
      </div>

      {/* create modal */}
      <Modal open={newOpen} onClose={() => setNewOpen(false)}>
        <div className="p-6">
          <h2 className="font-display text-xl font-semibold mb-4">New board</h2>
          <label className="text-[12px] font-semibold text-ink3 uppercase tracking-wide">Title</label>
          <Input value={title} onChange={(e) => setTitle(e.target.value)} onKeyDown={(e) => e.key === 'Enter' && create()} placeholder="e.g. Anatomy finals sprint" className="mt-1.5" autoFocus />
          <label className="text-[12px] font-semibold text-ink3 uppercase tracking-wide block mt-4">Color</label>
          <div className="flex gap-2 mt-2">
            {BOARD_COLORS.map((c) => (
              <button
                key={c}
                onClick={() => setColor(c)}
                className={cn('w-8 h-8 rounded-full transition-transform', color === c && 'ring-2 ring-offset-2 ring-ink/40 scale-110 dark:ring-surface')}
                style={{ backgroundColor: c }}
                aria-label={`Color ${c}`}
              />
            ))}
          </div>
          <label className="text-[12px] font-semibold text-ink3 uppercase tracking-wide block mt-4">Icon</label>
          <div className="flex flex-wrap gap-1.5 mt-2">
            {BOARD_ICONS.map((ic) => (
              <button
                key={ic}
                onClick={() => setIcon(ic)}
                className={cn(
                  'grid place-items-center w-9 h-9 rounded-xl border transition-colors',
                  icon === ic ? 'border-accent bg-accent/10 text-accent' : 'border-line text-ink3 hover:bg-surface2',
                )}
                aria-label={ic}
              >
                <DynIcon name={ic} className="w-4 h-4" />
              </button>
            ))}
          </div>
          <div className="flex justify-end gap-2 mt-6">
            <Button variant="ghost" onClick={() => setNewOpen(false)}>Cancel</Button>
            <Button onClick={create} disabled={!title.trim()}>Create board</Button>
          </div>
        </div>
      </Modal>
    </Page>
  )
}

function SectionRow() {
  return (
    <div className="flex items-end justify-between">
      <div>
        <h3 className="font-display font-semibold text-[17px] tracking-tight">Starter boards</h3>
        <div className="text-[13px] text-ink3 mt-0.5">Shared by other students in Discover — one click to clone.</div>
      </div>
      <Link to="/discover" className="text-[12.5px] font-medium text-accent hover:underline shrink-0">Browse all</Link>
    </div>
  )
}
