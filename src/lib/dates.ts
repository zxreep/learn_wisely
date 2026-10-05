/** Local-day helpers. A "dayKey" is yyyy-mm-dd in the user's locale. */

export function dayKey(d: Date = new Date()): string {
  const y = d.getFullYear()
  const m = String(d.getMonth() + 1).padStart(2, '0')
  const day = String(d.getDate()).padStart(2, '0')
  return `${y}-${m}-${day}`
}

export function dateFromKey(key: string): Date {
  const [y, m, d] = key.split('-').map(Number)
  return new Date(y, m - 1, d)
}

export function addDays(key: string, n: number): string {
  const d = dateFromKey(key)
  d.setDate(d.getDate() + n)
  return dayKey(d)
}

export const todayKey = () => dayKey(new Date())
export const yesterdayKey = () => addDays(todayKey(), -1)

export function diffDays(a: string, b: string): number {
  // b - a in days
  return Math.round((dateFromKey(b).getTime() - dateFromKey(a).getTime()) / 86400000)
}

export function lastNDays(n: number, endKey = todayKey()): string[] {
  const out: string[] = []
  for (let i = n - 1; i >= 0; i--) out.push(addDays(endKey, -i))
  return out
}

const WEEKDAYS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat']
const MONTHS = [
  'Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun',
  'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec',
]

export function weekdayName(key: string): string {
  return WEEKDAYS[dateFromKey(key).getDay()]
}

export function shortDate(key: string): string {
  const d = dateFromKey(key)
  return `${MONTHS[d.getMonth()]} ${d.getDate()}`
}

export function niceDate(d: Date = new Date()): string {
  return `${WEEKDAYS[d.getDay()]}, ${MONTHS[d.getMonth()]} ${d.getDate()}`
}

/** ISO week key like 2026-W40 for weekly quests */
export function weekKey(d: Date = new Date()): string {
  const date = new Date(Date.UTC(d.getFullYear(), d.getMonth(), d.getDate()))
  const dayNum = date.getUTCDay() || 7
  date.setUTCDate(date.getUTCDate() + 4 - dayNum)
  const yearStart = new Date(Date.UTC(date.getUTCFullYear(), 0, 1))
  const weekNo = Math.ceil(((date.getTime() - yearStart.getTime()) / 86400000 + 1) / 7)
  return `${date.getUTCFullYear()}-W${String(weekNo).padStart(2, '0')}`
}

export function monthShort(d: Date) {
  return MONTHS[d.getMonth()]
}

/** Build the grid used by the activity heatmap: weeks x 7, oldest first. */
export function heatmapGrid(weeks: number): string[][] {
  const today = dateFromKey(todayKey())
  // align end to Saturday of current week
  const end = new Date(today)
  end.setDate(end.getDate() + (6 - end.getDay()))
  const start = new Date(end)
  start.setDate(start.getDate() - (weeks * 7 - 1))
  const out: string[][] = []
  let cur = new Date(start)
  for (let w = 0; w < weeks; w++) {
    const col: string[] = []
    for (let i = 0; i < 7; i++) {
      col.push(dayKey(cur))
      cur.setDate(cur.getDate() + 1)
    }
    out.push(col)
  }
  return out
}
