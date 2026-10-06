import { useEffect, useMemo, useState } from 'react'
import { AnimatePresence, motion } from 'framer-motion'
import {
  CloudRain, Flame, Hourglass, Leaf, ListChecks, Maximize2, Minimize2, Pause,
  Play, RotateCcw, Settings2, TreePine, Volume2, Waves, Wind, X, Zap,
} from 'lucide-react'
import { Button, Card, Chip, Input, Page, PageHeader, ProgressRing, SectionTitle, Switch } from '../components/ui'
import { useFocus, FOCUS_MODES, phaseDurationSec, workDurationMin } from '../stores/focus'
import { useBoards } from '../stores/boards'
import { useSettings } from '../stores/settings'
import { useAmbient, type AmbientKind } from '../hooks/useAmbient'
import { cn, formatClock, formatMinutes, plural, timeAgo } from '../lib/utils'
import { todayKey, dayKey } from '../lib/dates'

export default function FocusPage() {
  const { settings, updateSettings, sessions, timer, setMode, setCustomMin, setLabel, startTimer, pauseTimer, endTimer } = useFocus()
  const boards = useBoards((s) => s.boards)
  const dailyGoal = useSettings((s) => s.dailyGoalMin)
  const [zen, setZen] = useState(false)
  const [settingsOpen, setSettingsOpen] = useState(false)

  const { mode, phase, cycle, label, running, secondsLeft } = timer
  const workMin = workDurationMin(timer)
  const total = phaseDurationSec(timer, settings, phase)

  const openTasks = useMemo(
    () => boards.flatMap((b) => b.cards.filter((c) => !c.done).map((c) => ({ board: b, card: c }))),
    [boards],
  )

  // document title while running
  useEffect(() => {
    if (running) document.title = `${formatClock(secondsLeft)} · ${phase === 'work' ? 'Focus' : 'Break'} — Wisely`
    else document.title = 'Wisely — your study workspace'
    return () => { document.title = 'Wisely — your study workspace' }
  }, [running, secondsLeft, phase])

  const switchMode = (m: string) => {
    if (timer.running && !confirm('Switching mode ends the current timer. Continue?')) return
    setMode(m)
  }

  const pct = 1 - secondsLeft / total

  const todaySessions = useMemo(() => {
    const key = todayKey()
    return sessions.filter((s) => dayKey(new Date(s.startedAt)) === key)
  }, [sessions])
  const todayMin = todaySessions.reduce((s, x) => s + x.minutes, 0)

  const endEarly = () => {
    const hasProgress = timer.phase === 'work' && timer.workedSec >= 60
    if (hasProgress) {
      if (!confirm(`End session and log ${Math.round(timer.workedSec / 60)} minutes?`)) return
    } else if (timer.running || timer.secondsLeft < total) {
      if (!confirm('Discard this timer? (Sessions under a minute aren’t logged.)')) return
    } else return
    endTimer()
  }

  return (
    <Page className="max-w-[1080px]">
      <PageHeader
        title="Focus mode"
        subtitle="One timer, one task, zero tab-switching. The timer keeps running if you navigate away or reload."
        actions={
          <Button variant="subtle" onClick={() => setSettingsOpen((v) => !v)}>
            <Settings2 className="w-4 h-4" /> Timer settings
          </Button>
        }
      />

      {/* mode picker */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-2.5 mb-5">
        {FOCUS_MODES.map((m) => (
          <button
            key={m.id}
            onClick={() => switchMode(m.id)}
            className={cn(
              'rounded-2xl border p-3.5 text-left transition-all',
              mode === m.id
                ? 'border-accent bg-accent/5 shadow-card'
                : 'border-line bg-surface hover:border-ink3/40',
            )}
          >
            <div className="flex items-center gap-1.5 font-semibold text-[13.5px]">
              {m.id === 'pomodoro' && <Hourglass className="w-4 h-4 text-accent2" />}
              {m.id === 'deep' && <Waves className="w-4 h-4 text-violet" />}
              {m.id === 'sprint' && <Zap className="w-4 h-4 text-accent" />}
              {m.id === 'custom' && <Settings2 className="w-4 h-4 text-ink2" />}
              {m.label}
            </div>
            <div className="text-[11.5px] text-ink3 mt-1 leading-snug">
              {m.id === 'custom' ? `${timer.customMin} min · you pick` : m.desc}
            </div>
          </button>
        ))}
      </div>

      {/* settings drawer */}
      <AnimatePresence>
        {settingsOpen && (
          <motion.div initial={{ height: 0, opacity: 0 }} animate={{ height: 'auto', opacity: 1 }} exit={{ height: 0, opacity: 0 }} className="overflow-hidden">
            <Card className="p-4 mb-5 grid sm:grid-cols-5 gap-3 items-end">
              {mode === 'custom' && (
                <NumField label="Work (min)" value={timer.customMin} min={5} max={240} onChange={setCustomMin} />
              )}
              <NumField label="Short break" value={settings.shortMin} min={1} max={30} onChange={(v) => updateSettings({ shortMin: v })} />
              <NumField label="Long break" value={settings.longMin} min={5} max={60} onChange={(v) => updateSettings({ longMin: v })} />
              <NumField label="Cycles" value={settings.cycles} min={2} max={8} onChange={(v) => updateSettings({ cycles: v })} />
              <label className="flex items-center gap-2 text-[13px] font-medium pb-2">
                <Switch checked={settings.autoBreaks} onChange={(v) => updateSettings({ autoBreaks: v })} /> Auto-start breaks
              </label>
            </Card>
          </motion.div>
        )}
      </AnimatePresence>

      <div className="grid lg:grid-cols-[1.25fr_1fr] gap-4 items-start">
        {/* ------------------------------------------------------ timer */}
        <Card className="p-6 sm:p-8 text-center relative overflow-hidden">
          <div className="absolute inset-0 pointer-events-none opacity-60" style={{ background: `radial-gradient(420px 260px at 50% 0%, rgb(var(--c-accent) / ${phase === 'work' ? 0.07 : 0.03}), transparent)` }} />
          <div className="relative">
            <div className="flex items-center justify-center gap-2 mb-5">
              <Chip color={phase === 'work' ? '#2f6b4f' : '#5b7fb0'}>
                {phase === 'work' ? (mode === 'pomodoro' ? `Focus · cycle ${cycle}/${settings.cycles}` : FOCUS_MODES.find((m) => m.id === mode)?.label) : phase === 'short' ? 'Short break' : 'Long break'}
              </Chip>
              {running && <Chip><span className="w-1.5 h-1.5 rounded-full bg-accent2 animate-pulse-soft inline-block" /> live</Chip>}
            </div>

            <ProgressRing value={pct} size={232} stroke={10} color={phase === 'work' ? undefined : 'rgb(var(--c-accent2))'}>
              <div>
                <div className="font-display font-semibold text-[54px] leading-none tabular-nums tracking-tight">
                  {formatClock(secondsLeft)}
                </div>
                <div className="text-[12px] text-ink3 mt-2 max-w-[180px] mx-auto truncate px-2">{phase === 'work' ? label || 'free focus' : 'stretch, water, window'}</div>
              </div>
            </ProgressRing>

            <div className="flex items-center justify-center gap-2.5 mt-7">
              {running ? (
                <Button size="lg" onClick={pauseTimer} variant="subtle" className="min-w-[120px]">
                  <Pause className="w-[18px] h-[18px]" /> Pause
                </Button>
              ) : (
                <Button size="lg" onClick={startTimer} className="min-w-[120px]">
                  <Play className="w-[18px] h-[18px]" /> {secondsLeft < total ? 'Resume' : 'Start'}
                </Button>
              )}
              <Button size="lg" variant="subtle" onClick={() => setZen(true)} aria-label="Zen mode">
                <Maximize2 className="w-[18px] h-[18px]" />
              </Button>
              <Button size="lg" variant="ghost" onClick={endEarly} className="text-ink3">
                <RotateCcw className="w-4 h-4" /> End
              </Button>
            </div>
          </div>
        </Card>

        {/* -------------------------------------------------- side panel */}
        <div className="space-y-4">
          <Card className="p-5">
            <div className="flex justify-between text-[12px] text-ink3 mb-1.5">
              <span className="font-medium flex items-center gap-1.5"><Flame className="w-3.5 h-3.5 text-accent2" /> Today</span>
              <span>{formatMinutes(todayMin)} / {formatMinutes(dailyGoal)}</span>
            </div>
            <div className="h-2 rounded-full bg-surface3 overflow-hidden">
              <motion.div className="h-full bg-accent2 rounded-full" initial={false} animate={{ width: `${Math.min(100, (todayMin / dailyGoal) * 100)}%` }} />
            </div>
            <div className="text-[11.5px] text-ink3 mt-1.5">{plural(todaySessions.length, 'session')} completed today</div>
          </Card>

          {/* task */}
          <Card className="p-5">
            <SectionTitle title="What are you focusing on?" />
            <Input
              value={label}
              onChange={(e) => setLabel(e.target.value)}
              placeholder="e.g. Biology ch. 7 problem set"
              className="mt-2.5"
            />
            {openTasks.length > 0 && !label && (
              <div className="mt-2.5 space-y-1 max-h-[130px] overflow-y-auto">
                {openTasks.slice(0, 5).map(({ board, card }) => (
                  <button
                    key={card.id}
                    onClick={() => setLabel(card.title)}
                    className="w-full flex items-center gap-2 px-2.5 py-1.5 rounded-lg text-left text-[12.5px] hover:bg-surface2 transition-colors"
                  >
                    <ListChecks className="w-3.5 h-3.5 text-ink3 shrink-0" />
                    <span className="truncate">{card.title}</span>
                    <span className="ml-auto text-[10.5px] text-ink3 shrink-0">{board.title}</span>
                  </button>
                ))}
              </div>
            )}
          </Card>

          {/* soundscapes */}
          <SoundPanel />
        </div>
      </div>

      {/* history */}
      <Card className="mt-4 p-5">
        <SectionTitle title="Recent sessions" desc="You earn 2 XP per focused minute, plus a completion bonus." />
        <div className="mt-3 divide-y divide-line/50">
          {sessions.slice(0, 8).map((s) => (
            <div key={s.id} className="flex items-center gap-3 py-2.5">
              <span className="grid place-items-center w-8 h-8 rounded-lg bg-accent/10 text-accent shrink-0">
                <Hourglass className="w-4 h-4" />
              </span>
              <div className="min-w-0 flex-1">
                <div className="text-[13px] font-medium truncate">{s.label}</div>
                <div className="text-[11px] text-ink3">{s.mode} · {timeAgo(s.startedAt + s.minutes * 60000)}</div>
              </div>
              <Chip>{formatMinutes(s.minutes)}</Chip>
            </div>
          ))}
          {sessions.length === 0 && <div className="text-sm text-ink3 py-6 text-center">No sessions yet — your first one starts the streak.</div>}
        </div>
      </Card>

      {/* zen overlay */}
      <ZenOverlay open={zen} onClose={() => setZen(false)}>
        <>
          <Chip color={phase === 'work' ? '#2f6b4f' : '#5b7fb0'}>{phase === 'work' ? 'focusing' : 'break'}</Chip>
          <div className="relative mt-8 mb-8">
            <div className="absolute inset-0 -m-10 rounded-full bg-accent/10 animate-breathe" />
            <ProgressRing value={pct} size={300} stroke={6} color={phase === 'work' ? undefined : 'rgb(var(--c-accent2))'}>
              <div className="font-display font-semibold text-[76px] tabular-nums tracking-tight">{formatClock(secondsLeft)}</div>
            </ProgressRing>
          </div>
          <div className="font-hand text-3xl text-ink2 max-w-md text-center px-4">{label || 'one thing at a time'}</div>
          <div className="flex items-center gap-3 mt-8">
            {running ? (
              <Button size="lg" variant="subtle" onClick={pauseTimer}><Pause className="w-4 h-4" /> Pause</Button>
            ) : (
              <Button size="lg" onClick={startTimer}><Play className="w-4 h-4" /> {secondsLeft < total ? 'Resume' : 'Start'}</Button>
            )}
            <Button size="lg" variant="ghost" onClick={() => setZen(false)}><Minimize2 className="w-4 h-4" /> Exit zen</Button>
          </div>
        </>
      </ZenOverlay>
    </Page>
  )
}

/* ------------------------------ sound panel ----------------------------- */
function SoundPanel() {
  const { kind, setKind, volume, setVolume, playing } = useAmbient()
  const options: { id: AmbientKind; label: string; icon: React.ComponentType<{ className?: string }>; desc: string }[] = [
    { id: 'rain', label: 'Rain', icon: CloudRain, desc: 'steady drizzle' },
    { id: 'brown', label: 'Low hum', icon: Wind, desc: 'brown noise' },
    { id: 'forest', label: 'Forest', icon: TreePine, desc: 'birds & wind' },
  ]
  return (
    <Card className="p-5">
      <SectionTitle
        title="Soundscape"
        desc="Generated live with WebAudio — works offline."
        right={playing ? <Leaf className="w-4 h-4 text-accent animate-pulse-soft" /> : undefined}
      />
      <div className="grid grid-cols-4 gap-1.5 mt-3">
        <button
          onClick={() => setKind('off')}
          className={cn('rounded-xl border py-2.5 text-center transition-colors', kind === 'off' ? 'border-accent bg-accent/5' : 'border-line hover:bg-surface2')}
        >
          <X className="w-4 h-4 mx-auto text-ink3" />
          <div className="text-[11px] font-medium mt-1">Off</div>
        </button>
        {options.map((o) => (
          <button
            key={o.id}
            onClick={() => setKind(kind === o.id ? 'off' : o.id)}
            className={cn('rounded-xl border py-2.5 text-center transition-colors', kind === o.id ? 'border-accent bg-accent/5' : 'border-line hover:bg-surface2')}
            title={o.desc}
          >
            <o.icon className={cn('w-4 h-4 mx-auto', kind === o.id ? 'text-accent' : 'text-ink3')} />
            <div className="text-[11px] font-medium mt-1">{o.label}</div>
          </button>
        ))}
      </div>
      <div className="flex items-center gap-2.5 mt-3.5">
        <Volume2 className="w-4 h-4 text-ink3 shrink-0" />
        <input
          type="range" min={0} max={1} step={0.05} value={volume}
          onChange={(e) => setVolume(Number(e.target.value))}
          className="w-full accent-[rgb(var(--c-accent))]"
          aria-label="Volume"
        />
      </div>
    </Card>
  )
}

/* ------------------------------ zen overlay ----------------------------- */
function ZenOverlay({ open, onClose, children }: { open: boolean; onClose: () => void; children: React.ReactNode }) {
  useEffect(() => {
    if (!open) return
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && onClose()
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [open, onClose])

  return (
    <AnimatePresence>
      {open && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="fixed inset-0 z-[70] bg-bg flex flex-col items-center justify-center p-6 overflow-hidden"
        >
          <div className="absolute inset-0 pointer-events-none" style={{ background: 'radial-gradient(800px 500px at 50% 120%, rgb(var(--c-accent) / 0.08), transparent)' }} />
          <button onClick={onClose} className="absolute top-5 right-5 p-2.5 rounded-xl text-ink3 hover:bg-surface2" aria-label="Exit zen mode">
            <X className="w-5 h-5" />
          </button>
          {children}
        </motion.div>
      )}
    </AnimatePresence>
  )
}

function NumField({ label, value, min, max, onChange }: { label: string; value: number; min: number; max: number; onChange: (v: number) => void }) {
  return (
    <div>
      <label className="text-[11px] font-semibold text-ink3 uppercase tracking-wide">{label}</label>
      <input
        type="number" min={min} max={max} value={value}
        onChange={(e) => onChange(Math.min(max, Math.max(min, Number(e.target.value) || min)))}
        className="mt-1 w-full h-[38px] rounded-xl border border-line bg-surface px-3 text-sm outline-none focus:border-accent/60"
      />
    </div>
  )
}
