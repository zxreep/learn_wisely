import { useMemo } from 'react'
import { Link } from 'react-router-dom'
import { motion } from 'framer-motion'
import { Award, CheckCircle2, Coins, Flame, Flag, Layers, Lock, Sparkles, Timer, TrendingUp } from 'lucide-react'
import { Card, Chip, Page, PageHeader, ProgressBar, ProgressRing, SectionTitle, Tabs } from '../components/ui'
import { Heatmap, WeekBars } from '../components/charts'
import { DynIcon } from '../components/icons'
import { BADGES, useProgress, levelFromXp, xpForLevel } from '../stores/progress'
import { useLibrary, allDue } from '../stores/library'
import { lastNDays, todayKey, weekdayName, niceDate } from '../lib/dates'
import { cn, formatMinutes, plural, timeAgo } from '../lib/utils'
import { useState } from 'react'

export default function Progress() {
  const { xp, activity, streak, quests, badges, xpEvents, counters, weeklyXp } = useProgress()
  const [metric, setMetric] = useState<'minutes' | 'xp' | 'cards'>('minutes')
  const [tab, setTab] = useState<'daily' | 'weekly'>('daily')

  const level = levelFromXp(xp)
  const base = xpForLevel(level)
  const next = xpForLevel(level + 1)
  const pct = (xp - base) / Math.max(1, next - base)

  const week = useMemo(() => {
    const keys = lastNDays(7)
    return keys.map((k) => ({
      key: k,
      label: weekdayName(k).slice(0, 2),
      value: metric === 'minutes' ? activity[k]?.minutes ?? 0 : metric === 'xp' ? activity[k]?.xp ?? 0 : activity[k]?.cards ?? 0,
      today: k === todayKey(),
    }))
  }, [activity, metric])

  const activeDays = Object.keys(activity).length
  const shownQuests = quests.filter((q) => q.kind === tab)

  return (
    <Page>
      <PageHeader title="Progress" subtitle={`${niceDate()} · every minute you log compounds.`} />

      {/* level hero */}
      <Card className="p-5 sm:p-6 mb-4 relative overflow-hidden">
        <div className="absolute inset-0 pointer-events-none" style={{ background: 'radial-gradient(500px 220px at 0% 0%, rgb(var(--c-accent2) / 0.07), transparent)' }} />
        <div className="relative flex flex-wrap items-center gap-6">
          <ProgressRing value={pct} size={110} stroke={9} color="rgb(var(--c-accent2))">
            <div>
              <div className="text-[10px] font-semibold uppercase tracking-wide text-ink3">Level</div>
              <div className="font-display font-bold text-3xl leading-none">{level}</div>
            </div>
          </ProgressRing>
          <div className="flex-1 min-w-[200px]">
            <div className="font-display font-semibold text-xl">{xp.toLocaleString()} XP</div>
            <div className="text-[13px] text-ink3 mt-0.5">{(next - xp).toLocaleString()} XP to level {level + 1}</div>
            <div className="flex flex-wrap gap-1.5 mt-2.5">
              <Chip><TrendingUp className="w-3 h-3" /> {weeklyXp().toLocaleString()} XP this week</Chip>
              <Chip>{activeDays} active days</Chip>
            </div>
          </div>
          <div className="grid grid-cols-3 gap-4 text-center">
            <MiniStat icon={<Flame className="w-4.5 h-4.5 w-[18px] h-[18px] text-accent2" />} value={streak.current} label="day streak" />
            <MiniStat icon={<Timer className="w-4.5 h-4.5 w-[18px] h-[18px] text-accent" />} value={formatMinutes(counters['focus-minutes'])} label="lifetime focus" />
            <MiniStat icon={<Layers className="w-4.5 h-4.5 w-[18px] h-[18px] text-violet" />} value={counters['cards-reviewed']} label="cards reviewed" />
          </div>
        </div>
      </Card>

      <div className="grid lg:grid-cols-3 gap-4 items-start">
        <div className="lg:col-span-2 space-y-4">
          {/* chart */}
          <Card className="p-5">
            <SectionTitle
              title="Last 7 days"
              right={
                <Tabs
                  options={[
                    { value: 'minutes', label: 'Minutes' },
                    { value: 'xp', label: 'XP' },
                    { value: 'cards', label: 'Cards' },
                  ]}
                  value={metric}
                  onChange={setMetric}
                />
              }
            />
            <WeekBars data={week} className="mt-4" unit={metric === 'minutes' ? 'm' : ''} />
          </Card>

          {/* heatmap */}
          <Card className="p-5">
            <SectionTitle title="Activity heatmap" desc="Focus minutes over the last 20 weeks — hover a cell for details." />
            <Heatmap activity={activity} weeks={20} className="mt-4 pb-1" />
          </Card>

          {/* streak */}
          <Card className="p-5">
            <SectionTitle title="Streak" desc="Study anything on a day to keep it alive." />
            <div className="flex items-center gap-5 mt-4">
              <div className="text-center">
                <div className="font-display font-bold text-4xl">{streak.current}</div>
                <div className="text-[11px] text-ink3 uppercase tracking-wide mt-0.5">current</div>
              </div>
              <div className="w-px self-stretch bg-line" />
              <div className="text-center">
                <div className="font-display font-bold text-4xl text-ink2">{streak.longest}</div>
                <div className="text-[11px] text-ink3 uppercase tracking-wide mt-0.5">longest</div>
              </div>
              <div className="flex-1 flex gap-1 justify-end flex-wrap">
                {lastNDays(14).map((k) => {
                  const on = (activity[k]?.minutes ?? 0) > 0 || (activity[k]?.xp ?? 0) > 0
                  const today = k === todayKey()
                  return (
                    <div
                      key={k}
                      title={k}
                      className={cn(
                        'w-6 h-9 rounded-lg border grid place-items-center text-[9px] font-bold',
                        on ? 'bg-accent/15 border-accent/40 text-accent' : 'bg-surface2 border-line text-ink3/50',
                        today && 'ring-1 ring-accent2',
                      )}
                    >
                      {on ? <Flame className="w-3 h-3" /> : '·'}
                    </div>
                  )
                })}
              </div>
            </div>
          </Card>

          {/* badges */}
          <Card className="p-5">
            <SectionTitle
              title="Badges"
              desc={`${Object.keys(badges).length} of ${BADGES.length} unlocked`}
              right={<Chip><Award className="w-3 h-3" /> +50 XP each</Chip>}
            />
            <div className="grid grid-cols-2 sm:grid-cols-3 xl:grid-cols-4 gap-2.5 mt-4">
              {BADGES.map((b, i) => {
                const unlockedAt = badges[b.id]
                return (
                  <motion.div
                    key={b.id}
                    initial={{ opacity: 0, y: 8 }}
                    whileInView={{ opacity: 1, y: 0 }}
                    viewport={{ once: true }}
                    transition={{ delay: Math.min(i * 0.03, 0.3) }}
                    className={cn(
                      'rounded-2xl border p-3.5 text-center transition-all',
                      unlockedAt
                        ? 'border-accent2/40 bg-accent2/8 bg-accent2/5'
                        : 'border-line bg-surface2/40 opacity-60',
                    )}
                  >
                    <div className={cn('mx-auto grid place-items-center w-10 h-10 rounded-xl', unlockedAt ? 'bg-accent2/15 text-accent2' : 'bg-surface3 text-ink3')}>
                      {unlockedAt ? <DynIcon name={b.icon} className="w-5 h-5" /> : <Lock className="w-4 h-4" />}
                    </div>
                    <div className="text-[12.5px] font-semibold mt-2 leading-tight">{b.name}</div>
                    <div className="text-[10.5px] text-ink3 mt-0.5 leading-snug">{b.desc}</div>
                    {unlockedAt && <div className="text-[9.5px] text-accent2 font-semibold mt-1.5 uppercase tracking-wide">{timeAgo(unlockedAt)}</div>}
                  </motion.div>
                )
              })}
            </div>
          </Card>
        </div>

        {/* right column */}
        <div className="space-y-4">
          {/* quests */}
          <Card className="p-5">
            <SectionTitle
              title="Quests"
              right={
                <Tabs
                  options={[
                    { value: 'daily', label: 'Daily' },
                    { value: 'weekly', label: 'Weekly' },
                  ]}
                  value={tab}
                  onChange={setTab}
                />
              }
            />
            <div className="space-y-3.5 mt-4">
              {shownQuests.map((q) => (
                <div key={q.id} className={cn(q.done && 'opacity-70')}>
                  <div className="flex items-center gap-2">
                    <div className={cn('grid place-items-center w-5 h-5 rounded-full border shrink-0', q.done ? 'bg-ok border-ok text-white' : 'border-line text-transparent')}>
                      <CheckCircle2 className="w-3.5 h-3.5" />
                    </div>
                    <div className={cn('text-[13px] font-medium leading-tight', q.done && 'line-through')}>{q.title}</div>
                  </div>
                  <div className="flex items-center gap-2 mt-1.5 ml-7">
                    <ProgressBar value={(q.progress / q.target) * 100} className="flex-1" color={q.done ? 'rgb(var(--c-ok))' : undefined} />
                    <span className="text-[10.5px] text-ink3 shrink-0">{Math.min(q.progress, q.target)}/{q.target}</span>
                  </div>
                  <div className="text-[10.5px] text-ink3 mt-1 ml-7 flex items-center gap-1">
                    <Flag className="w-3 h-3" /> {q.desc} · <span className="text-accent2 font-semibold">+{q.xp} XP</span>
                  </div>
                </div>
              ))}
              {shownQuests.length === 0 && <div className="text-sm text-ink3">Quests refresh at midnight.</div>}
            </div>
          </Card>

          {/* due cards CTA */}
          <Card className="p-5">
            <CardsDueCard />
          </Card>

          {/* XP feed */}
          <Card className="p-5">
            <SectionTitle title="XP feed" desc="Everything that earned you points lately." />
            <div className="mt-3 space-y-2 max-h-[340px] overflow-y-auto pr-1">
              {xpEvents.length === 0 && <div className="text-sm text-ink3">Study, review or quest to start earning.</div>}
              {xpEvents.map((e) => (
                <div key={e.id} className="flex items-center gap-2.5">
                  <span className="grid place-items-center w-7 h-7 rounded-lg bg-accent2/12 bg-accent2/10 text-accent2 shrink-0">
                    <Coins className="w-3.5 h-3.5" />
                  </span>
                  <div className="min-w-0 flex-1">
                    <div className="text-[12.5px] font-medium truncate">{e.label}</div>
                    <div className="text-[10.5px] text-ink3">{timeAgo(e.at)}</div>
                  </div>
                  <span className="text-[12px] font-bold text-accent2 shrink-0">+{e.xp}</span>
                </div>
              ))}
            </div>
          </Card>
        </div>
      </div>
    </Page>
  )
}

function MiniStat({ icon, value, label }: { icon: React.ReactNode; value: React.ReactNode; label: string }) {
  return (
    <div className="min-w-[88px]">
      <div className="flex justify-center">{icon}</div>
      <div className="font-display font-bold text-lg mt-1 leading-none">{value}</div>
      <div className="text-[10px] text-ink3 uppercase tracking-wide mt-1">{label}</div>
    </div>
  )
}

function CardsDueCard() {
  const cards = useLibrary((s) => s.cards)
  const due = allDue(cards).length
  return (
    <div className="flex items-center gap-3.5">
      <span className="grid place-items-center w-11 h-11 rounded-xl bg-violet/15 text-violet shrink-0">
        <Layers className="w-5 h-5" />
      </span>
      <div className="flex-1">
        <div className="font-semibold text-[14px]">{due > 0 ? plural(due, 'flashcard') + ' due' : 'No cards due'}</div>
        <div className="text-[12px] text-ink3 mt-0.5">{due > 0 ? 'A quick review now keeps the forgetting curve away.' : 'Enjoy the clean slate.'}</div>
      </div>
      {due > 0 && (
        <Link to="/library?tab=decks" className="text-[12px] font-semibold text-accent hover:underline shrink-0">Review</Link>
      )}
    </div>
  )
}
