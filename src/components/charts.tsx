import { useMemo } from 'react'
import { heatmapGrid, weekdayName, shortDate, todayKey, monthShort, dateFromKey } from '../lib/dates'
import { cn, formatMinutes } from '../lib/utils'
import type { DayLog } from '../lib/types'

/* ------------------------------ Heatmap --------------------------------- */
export function Heatmap({
  activity, weeks = 20, metric = 'minutes', className,
}: { activity: Record<string, DayLog>; weeks?: number; metric?: 'minutes' | 'xp' | 'cards'; className?: string }) {
  const grid = useMemo(() => heatmapGrid(weeks), [weeks])
  const today = todayKey()
  const max = useMemo(() => {
    let m = 1
    for (const d of grid.flat()) m = Math.max(m, valueOf(activity[d], metric))
    return m
  }, [activity, grid, metric])

  const level = (v: number) => {
    if (v <= 0) return 0
    const t = v / max
    return t < 0.25 ? 1 : t < 0.55 ? 2 : t < 0.85 ? 3 : 4
  }

  const monthLabels = useMemo(() => {
    const labels: { i: number; label: string }[] = []
    let prev = -1
    grid.forEach((col, i) => {
      const d = dateFromKey(col[0])
      if (d.getMonth() !== prev) {
        labels.push({ i, label: monthShort(d) })
        prev = d.getMonth()
      }
    })
    return labels
  }, [grid])

  return (
    <div className={cn('overflow-x-auto no-scrollbar', className)}>
      <div className="min-w-fit">
        <div className="flex gap-[3px] mb-1 h-4 text-[10px] text-ink3 relative select-none">
          {monthLabels.map((m, k) => (
            <span key={k} className="absolute" style={{ left: m.i * 15 }}>
              {m.label}
            </span>
          ))}
        </div>
        <div className="flex gap-[3px]">
          {grid.map((col, i) => (
            <div key={i} className="flex flex-col gap-[3px]">
              {col.map((day) => {
                const v = valueOf(activity[day], metric)
                const future = day > today
                return (
                  <div
                    key={day}
                    title={`${weekdayName(day)} ${shortDate(day)} — ${future ? 'upcoming' : v === 0 ? 'no activity' : `${formatMinutes(v)}`}`}
                    className={cn(
                      'w-3 h-3 rounded-[3px] transition-transform hover:scale-125',
                      future && 'opacity-20',
                      day === today && 'ring-1 ring-accent2 ring-offset-1 ring-offset-bg',
                    )}
                    style={{
                      backgroundColor: future
                        ? 'rgb(var(--c-surface3))'
                        : level(v) === 0
                          ? 'rgb(var(--c-surface3) / 0.55)'
                          : `rgb(var(--c-accent) / ${0.28 * level(v) + (level(v) === 4 ? 0 : 0)})`,
                    }}
                  />
                )
              })}
            </div>
          ))}
        </div>
        <div className="flex items-center gap-1.5 mt-2.5 text-[10px] text-ink3 select-none">
          <span>Less</span>
          {[0.25, 0.45, 0.7, 1].map((o) => (
            <span key={o} className="w-3 h-3 rounded-[3px]" style={{ backgroundColor: `rgb(var(--c-accent) / ${o})` }} />
          ))}
          <span>More</span>
        </div>
      </div>
    </div>
  )
}

function valueOf(d: DayLog | undefined, metric: 'minutes' | 'xp' | 'cards') {
  if (!d) return 0
  return metric === 'minutes' ? d.minutes : metric === 'xp' ? d.xp : d.cards
}

/* ---------------------------- Weekly bar chart -------------------------- */
export function WeekBars({
  data, goal, className, unit = 'm',
}: { data: { key: string; label: string; value: number; today?: boolean }[]; goal?: number; className?: string; unit?: string }) {
  const max = Math.max(goal ?? 0, ...data.map((d) => d.value), 1)
  return (
    <div className={className}>
      <div className="flex items-end gap-2 h-36">
        {data.map((d) => (
          <div key={d.key} className="flex-1 flex flex-col items-center gap-1.5 h-full justify-end group">
            <div
              className="text-[10px] font-semibold text-ink2 opacity-0 group-hover:opacity-100 transition-opacity"
              aria-hidden
            >
              {Math.round(d.value)}{unit}
            </div>
            <div
              className={cn(
                'w-full max-w-9 rounded-t-md transition-all',
                d.today ? 'bg-accent2' : 'bg-accent/70 group-hover:bg-accent',
                d.value === 0 && 'bg-surface3',
              )}
              style={{ height: `${Math.max(2, (d.value / max) * 100)}%` }}
              title={`${d.label}: ${Math.round(d.value)}${unit}`}
            />
            <div className={cn('text-[10px]', d.today ? 'text-accent2 font-bold' : 'text-ink3')}>{d.label}</div>
          </div>
        ))}
      </div>
      {goal && (
        <div className="text-[11px] text-ink3 mt-2 flex items-center gap-1.5">
          <span className="inline-block w-4 border-t-2 border-dashed border-ink3" />
          Daily goal: {goal}{unit}
        </div>
      )}
    </div>
  )
}

/* ------------------------------- Donut ---------------------------------- */
export function Donut({
  segments, size = 120, stroke = 14, center, className,
}: { segments: { value: number; color: string; label: string }[]; size?: number; stroke?: number; center?: React.ReactNode; className?: string }) {
  const total = segments.reduce((s, x) => s + x.value, 0) || 1
  const r = (size - stroke) / 2
  const c = 2 * Math.PI * r
  let offset = 0
  return (
    <div className={cn('relative inline-grid place-items-center', className)} style={{ width: size, height: size }}>
      <svg width={size} height={size} className="-rotate-90">
        <circle cx={size / 2} cy={size / 2} r={r} fill="none" strokeWidth={stroke} className="stroke-surface3" />
        {segments.map((s, i) => {
          const len = (s.value / total) * c
          const el = (
            <circle
              key={i}
              cx={size / 2} cy={size / 2} r={r} fill="none"
              stroke={s.color} strokeWidth={stroke}
              strokeDasharray={`${len} ${c - len}`}
              strokeDashoffset={-offset}
              strokeLinecap="butt"
            >
              <title>{s.label}: {s.value}</title>
            </circle>
          )
          offset += len
          return el
        })}
      </svg>
      <div className="absolute inset-0 grid place-items-center">{center}</div>
    </div>
  )
}
