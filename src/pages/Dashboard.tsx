import { useMemo } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { motion } from 'framer-motion'
import {
  ArrowRight, ArrowUpRight, BookOpen, CheckCircle2, ClipboardList, Flame, Layers, Plus,
  Sparkles, Timer, TrendingUp, Zap,
} from 'lucide-react'
import { Button, Card, Chip, Page, ProgressBar, ProgressRing, SectionTitle, Stat } from '../components/ui'
import { WeekBars, Heatmap } from '../components/charts'
import { DynIcon, OwlMark } from '../components/icons'
import { useSettings } from '../stores/settings'
import { useProgress, levelFromXp, xpForLevel } from '../stores/progress'
import { useLibrary, allDue, dueOfDeck, masteryOf } from '../stores/library'
import { useBoards } from '../stores/boards'
import { useFocus } from '../stores/focus'
import { useUi } from '../stores/ui'
import { lastNDays, todayKey, weekdayName, niceDate } from '../lib/dates'
import { formatMinutes, truncate, plural, cn } from '../lib/utils'

export default function Dashboard() {
  const { name, dailyGoalMin } = useSettings()
  const { xp, activity, streak, quests } = useProgress()
  const { notes, cards, decks } = useLibrary()
  const { boards } = useBoards()
  const sessions = useFocus((s) => s.sessions)
  const { openAi, setPaletteOpen } = useUi()
  const navigate = useNavigate()

  const today = todayKey()
  const todayMinutes = activity[today]?.minutes ?? 0
  const level = levelFromXp(xp)
  const levelBase = xpForLevel(level)
  const levelNext = xpForLevel(level + 1)
  const levelPct = (xp - levelBase) / Math.max(1, levelNext - levelBase)
  const due = useMemo(() => allDue(cards), [cards])
  const todayQuests = quests.filter((q) => q.kind === 'daily')

  const week = useMemo(() => {
    const keys = lastNDays(7)
    return keys.map((k) => ({ key: k, label: weekdayName(k).slice(0, 2), value: activity[k]?.minutes ?? 0, today: k === today }))
  }, [activity, today])

  const recentNotes = useMemo(() => [...notes].sort((a, b) => b.updatedAt - a.updatedAt).slice(0, 5), [notes])
  const activeBoards = useMemo(() => [...boards].sort((a, b) => b.updatedAt - a.updatedAt).slice(0, 3), [boards])
  const openTasks = useMemo(
    () => boards.flatMap((b) => b.cards.filter((c) => !c.done).map((c) => ({ board: b, card: c }))).slice(0, 6),
    [boards],
  )
  const lastSession = sessions[0]
  const hour = new Date().getHours()
  const greeting = hour < 12 ? 'Good morning' : hour < 18 ? 'Good afternoon' : 'Good evening'

  return (
    <Page>
      {/* ------------------------------------------------------------ hero */}
      <div className="flex flex-wrap items-start justify-between gap-4 mb-6">
        <div>
          <div className="text-[13px] text-ink3">{niceDate()}</div>
          <h1 className="font-display text-[28px] sm:text-[32px] font-semibold tracking-tight leading-tight mt-0.5">
            {greeting}, {name}.
          </h1>
          <p className="text-sm text-ink3 mt-1">
            {due.length > 0
              ? <>You have <span className="font-semibold text-accent2">{due.length} flashcards due</span> · {formatMinutes(Math.max(0, dailyGoalMin - todayMinutes))} left of today's goal.</>
              : <>All flashcards reviewed. <span className="font-hand text-xl text-accent">Nice and clear.</span></>}
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="subtle" onClick={() => setPaletteOpen(true)}>
            <Sparkles className="w-4 h-4 text-accent2" /> Quick actions
            <kbd className="text-[10px] bg-surface border border-line rounded px-1 py-0.5 text-ink3">⌘K</kbd>
          </Button>
          <Button onClick={() => navigate('/focus')}>
            <Timer className="w-4 h-4" /> Start focus
          </Button>
        </div>
      </div>

      {/* ---------------------------------------------------------- stats */}
      <div className="grid grid-cols-2 xl:grid-cols-4 gap-3 mb-6">
        <Card className="p-4 flex items-center gap-4 col-span-2 xl:col-span-1">
          <ProgressRing value={levelPct} size={64} stroke={6}>
            <span className="font-display font-bold text-lg">{level}</span>
          </ProgressRing>
          <div className="min-w-0">
            <div className="text-[12px] font-medium text-ink3 uppercase tracking-wide">Level</div>
            <div className="text-sm font-semibold">{xp.toLocaleString()} XP</div>
            <div className="text-[11px] text-ink3">{(levelNext - xp).toLocaleString()} to level {level + 1}</div>
          </div>
        </Card>
        <Stat
          label="Day streak"
          value={`${streak.current} 🔥`}
          icon={<Flame className="w-5 h-5 text-accent2" />}
          hint={`best ${streak.longest}`}
        />
        <Stat
          label="Today"
          value={formatMinutes(todayMinutes)}
          icon={<Timer className="w-5 h-5" />}
          hint={`goal ${formatMinutes(dailyGoalMin)}`}
        />
        <Stat
          label="Cards due"
          value={due.length}
          icon={<Layers className="w-5 h-5" />}
          hint={due.length ? 'review to keep them fresh' : 'all caught up'}
        />
      </div>

      <div className="grid lg:grid-cols-3 gap-4">
        {/* ---------------------------------------------------- left col */}
        <div className="lg:col-span-2 space-y-4">
          {/* Focus CTA */}
          <Card className="p-5 relative overflow-hidden">
            <div
              className="absolute inset-0 opacity-[0.06] pointer-events-none"
              style={{ background: 'radial-gradient(600px 200px at 100% 0%, rgb(var(--c-accent)), transparent)' }}
            />
            <div className="flex flex-wrap items-center gap-5">
              <div className="flex-1 min-w-[220px]">
                <SectionTitle
                  title="Back to the desk?"
                  desc={lastSession ? `Last session: ${lastSession.label} · ${formatMinutes(lastSession.minutes)}` : 'Your first session starts the streak counter.'}
                />
                <div className="mt-3">
                  <div className="flex justify-between text-[12px] text-ink3 mb-1">
                    <span>Daily goal</span>
                    <span>{formatMinutes(todayMinutes)} / {formatMinutes(dailyGoalMin)}</span>
                  </div>
                  <ProgressBar value={(todayMinutes / dailyGoalMin) * 100} color={todayMinutes >= dailyGoalMin ? 'rgb(var(--c-ok))' : undefined} />
                </div>
              </div>
              <div className="flex gap-2">
                <Button variant="subtle" onClick={() => navigate('/library?tab=decks')}>
                  <Layers className="w-4 h-4" /> Review {due.length > 0 ? due.length : ''} cards
                </Button>
                <Button onClick={() => navigate('/focus')}>
                  <Zap className="w-4 h-4" /> Focus now
                </Button>
              </div>
            </div>
          </Card>

          {/* Quests */}
          <Card className="p-5">
            <SectionTitle
              title="Today's quests"
              desc="Fresh challenges every day at midnight."
              right={<Link to="/progress" className="text-[12px] font-medium text-accent hover:underline flex items-center gap-1">All quests <ArrowUpRight className="w-3.5 h-3.5" /></Link>}
            />
            <div className="mt-4 space-y-3">
              {todayQuests.length === 0 && <div className="text-sm text-ink3">Loading quests…</div>}
              {todayQuests.map((q) => (
                <div key={q.id} className="flex items-center gap-3">
                  <div
                    className={cn(
                      'grid place-items-center w-6 h-6 rounded-full border shrink-0 transition-colors',
                      q.done ? 'bg-ok border-ok text-white' : 'border-line text-transparent',
                    )}
                  >
                    <CheckCircle2 className="w-4 h-4" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className={cn('text-[13.5px] font-medium leading-tight', q.done && 'line-through text-ink3')}>
                      {q.title}
                    </div>
                    <div className="flex items-center gap-2 mt-1">
                      <ProgressBar value={(q.progress / q.target) * 100} className="flex-1 max-w-[180px]" />
                      <span className="text-[11px] text-ink3 shrink-0">
                        {Math.min(q.progress, q.target)}/{q.target} · <span className="text-accent2 font-semibold">+{q.xp} XP</span>
                      </span>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </Card>

          {/* Week chart + heatmap preview */}
          <Card className="p-5">
            <SectionTitle
              title="This week"
              desc="Focus minutes per day."
              right={<Chip><TrendingUp className="w-3 h-3" /> {formatMinutes(week.reduce((s, d) => s + d.value, 0))} total</Chip>}
            />
            <WeekBars data={week} goal={dailyGoalMin} className="mt-4" />
          </Card>

          <Card className="p-5">
            <SectionTitle
              title="Study activity"
              desc={`${Object.keys(activity).length} active days`}
              right={<Link to="/progress" className="text-[12px] font-medium text-accent hover:underline flex items-center gap-1">Full stats <ArrowUpRight className="w-3.5 h-3.5" /></Link>}
            />
            <Heatmap activity={activity} weeks={13} className="mt-4 pb-1" />
          </Card>
        </div>

        {/* --------------------------------------------------- right col */}
        <div className="space-y-4">
          {/* Ask Wisely */}
          <Card className="p-5">
            <div className="flex items-start gap-3">
              <OwlMark className="w-10 h-10 shrink-0" />
              <div>
                <div className="font-display font-semibold text-[16px] flex items-center gap-1.5">
                  Ask Wisely <Sparkles className="w-3.5 h-3.5 text-accent2" />
                </div>
                <p className="text-[12.5px] text-ink3 mt-1 leading-snug">
                  On-device AI that studies your library. Summarize notes, draft flashcards, quiz yourself — even at 30,000 ft.
                </p>
              </div>
            </div>
            <div className="grid grid-cols-2 gap-1.5 mt-3.5">
              {[
                { label: 'Ask a question', run: () => openAi('ask') },
                { label: 'Summarize a note', run: () => openAi('summarize', { noteId: recentNotes[0]?.id }) },
                { label: 'Make flashcards', run: () => openAi('flashcards', { noteId: recentNotes[0]?.id }) },
                { label: 'Quiz me', run: () => openAi('quiz', { deckId: decks[0]?.id }) },
              ].map((b) => (
                <button
                  key={b.label}
                  onClick={b.run}
                  className="text-left text-[12.5px] font-medium px-2.5 py-2 rounded-xl bg-surface2 hover:bg-surface3 border border-line/60 transition-colors"
                >
                  {b.label}
                </button>
              ))}
            </div>
          </Card>

          {/* Jump back in */}
          <Card className="p-5">
            <SectionTitle
              title="Jump back in"
              right={<Link to="/library" className="text-[12px] font-medium text-accent hover:underline">Library</Link>}
            />
            <div className="mt-3 space-y-1">
              {recentNotes.map((n) => (
                <Link
                  key={n.id}
                  to={`/library?note=${n.id}`}
                  className="flex items-center gap-2.5 px-2.5 py-2 rounded-xl hover:bg-surface2 transition-colors group"
                >
                  <BookOpen className="w-4 h-4 text-ink3 shrink-0" style={{ color: n.color }} />
                  <span className="text-[13px] font-medium truncate flex-1">{n.title}</span>
                  {n.favorite && <span className="text-accent2 text-[11px]">★</span>}
                </Link>
              ))}
              {recentNotes.length === 0 && <div className="text-sm text-ink3 px-2">No notes yet.</div>}
            </div>
          </Card>

          {/* Decks mastery */}
          <Card className="p-5">
            <SectionTitle
              title="Deck mastery"
              right={<Link to="/library?tab=decks" className="text-[12px] font-medium text-accent hover:underline">Study</Link>}
            />
            <div className="mt-3.5 space-y-3">
              {decks.slice(0, 4).map((d) => {
                const dueD = dueOfDeck(cards, d.id).length
                const total = cards.filter((c) => c.deckId === d.id).length
                return (
                  <Link to={`/library?deck=${d.id}`} key={d.id} className="block group">
                    <div className="flex items-center justify-between text-[12.5px] mb-1">
                      <span className="font-medium truncate">{d.title}</span>
                      <span className={cn('text-[11px] shrink-0', dueD > 0 ? 'text-accent2 font-semibold' : 'text-ink3')}>
                        {dueD > 0 ? `${dueD} due` : `${masteryOf(cards, d.id)}%`}
                      </span>
                    </div>
                    <ProgressBar value={masteryOf(cards, d.id)} color={d.color} />
                    {dueD === 0 && total > 0 && <div className="text-[10.5px] text-ink3 mt-0.5">{plural(total, 'card')} mastered</div>}
                  </Link>
                )
              })}
            </div>
          </Card>

          {/* Boards preview */}
          <Card className="p-5">
            <SectionTitle
              title="Study boards"
              right={<button onClick={() => navigate('/boards')} className="text-[12px] font-medium text-accent hover:underline">All boards</button>}
            />
            <div className="mt-3 space-y-1.5">
              {activeBoards.map((b) => {
                const open = b.cards.filter((c) => !c.done).length
                return (
                  <Link
                    key={b.id}
                    to={`/boards/${b.id}`}
                    className="flex items-center gap-2.5 px-2.5 py-2 rounded-xl hover:bg-surface2 transition-colors"
                  >
                    <span className="grid place-items-center w-7 h-7 rounded-lg shrink-0" style={{ backgroundColor: b.color + '22', color: b.color }}>
                      <DynIcon name={b.icon} className="w-3.5 h-3.5" />
                    </span>
                    <span className="text-[13px] font-medium truncate flex-1">{b.title}</span>
                    <span className="text-[11px] text-ink3">{plural(open, 'task')}</span>
                  </Link>
                )
              })}
            </div>
          </Card>

          {/* Up next tasks */}
          <Card className="p-5">
            <SectionTitle title="Up next" desc="Open tasks across boards" />
            <div className="mt-3 space-y-1">
              {openTasks.slice(0, 4).map(({ board, card }) => (
                <div key={card.id} className="flex items-center gap-2.5 px-2.5 py-1.5">
                  <ClipboardList className="w-3.5 h-3.5 text-ink3 shrink-0" />
                  <span className="text-[12.5px] truncate flex-1">{card.title}</span>
                  <button
                    onClick={() => useBoards.getState().toggleDone(board.id, card.id)}
                    className="text-[11px] font-semibold text-accent hover:underline shrink-0"
                  >
                    done
                  </button>
                </div>
              ))}
              {openTasks.length === 0 && (
                <div className="text-sm text-ink3 px-2">
                  Nothing open. <Link to="/boards" className="text-accent hover:underline inline-flex items-center gap-1">Plan something <Plus className="w-3 h-3" /></Link>
                </div>
              )}
            </div>
          </Card>
        </div>
      </div>
    </Page>
  )
}
