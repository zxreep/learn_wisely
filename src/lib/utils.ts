import { clsx, type ClassValue } from 'clsx'

export function cn(...inputs: ClassValue[]) {
  return clsx(inputs)
}

/** Collision-safe id generator (no crypto.randomUUID requirement). */
export function uid(prefix = 'id'): string {
  const rand = Math.random().toString(36).slice(2, 9)
  const time = Date.now().toString(36)
  return `${prefix}_${rand}${time}`
}

export function clamp(n: number, min: number, max: number) {
  return Math.min(max, Math.max(min, n))
}

export function formatMinutes(min: number): string {
  if (min < 60) return `${Math.round(min)}m`
  const h = Math.floor(min / 60)
  const m = Math.round(min % 60)
  return m ? `${h}h ${m}m` : `${h}h`
}

export function formatClock(sec: number): string {
  const s = Math.max(0, Math.round(sec))
  const m = Math.floor(s / 60)
  const r = s % 60
  return `${String(m).padStart(2, '0')}:${String(r).padStart(2, '0')}`
}

export function timeAgo(ts: number): string {
  const diff = Date.now() - ts
  const m = Math.floor(diff / 60000)
  if (m < 1) return 'just now'
  if (m < 60) return `${m}m ago`
  const h = Math.floor(m / 60)
  if (h < 24) return `${h}h ago`
  const d = Math.floor(h / 24)
  if (d < 7) return `${d}d ago`
  const w = Math.floor(d / 7)
  if (w < 5) return `${w}w ago`
  return new Date(ts).toLocaleDateString()
}

export function plural(n: number, word: string, words?: string) {
  return n === 1 ? `${n} ${word}` : `${n} ${words ?? word + 's'}`
}

/** Deterministic pseudo-random generator for stable seeds */
export function mulberry32(seed: number) {
  let a = seed >>> 0
  return function () {
    a |= 0
    a = (a + 0x6d2b79f5) | 0
    let t = Math.imul(a ^ (a >>> 15), 1 | a)
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296
  }
}

export function pick<T>(arr: T[], n: number, rand: () => number): T[] {
  const copy = [...arr]
  const out: T[] = []
  while (copy.length && out.length < n) {
    out.push(copy.splice(Math.floor(rand() * copy.length), 1)[0])
  }
  return out
}

export function download(filename: string, text: string, mime = 'application/json') {
  const blob = new Blob([text], { type: mime })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = filename
  a.click()
  URL.revokeObjectURL(url)
}

export function initials(name: string): string {
  return name
    .split(/\s+/)
    .map((w) => w[0])
    .filter(Boolean)
    .slice(0, 2)
    .join('')
    .toUpperCase()
}

export function truncate(s: string, n: number) {
  return s.length > n ? s.slice(0, n - 1).trimEnd() + '…' : s
}

/** naive markdown-lite → html for previewing seeded notes (escape first) */
export function mdLite(md: string): string {
  const esc = md
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
  const lines = esc.split('\n')
  let inList = false
  let out: string[] = []
  for (const line of lines) {
    const t = line.trimEnd()
    const bullet = /^[-•]\s+/.test(t)
    if (bullet && !inList) {
      out.push('<ul>')
      inList = true
    } else if (!bullet && inList) {
      out.push('</ul>')
      inList = false
    }
    if (t.startsWith('### ')) out.push(`<h3>${inline(t.slice(4))}</h3>`)
    else if (t.startsWith('## ')) out.push(`<h2>${inline(t.slice(3))}</h2>`)
    else if (t.startsWith('# ')) out.push(`<h1>${inline(t.slice(2))}</h1>`)
    else if (bullet) out.push(`<li>${inline(t.replace(/^[-•]\s+/, ''))}</li>`)
    else if (t.startsWith('&gt; ')) out.push(`<blockquote>${inline(t.slice(5))}</blockquote>`)
    else if (t === '' || t === '---') out.push(t === '---' ? '<hr/>' : '')
    else out.push(`<p>${inline(t)}</p>`)
  }
  if (inList) out.push('</ul>')
  return out.join('\n')
}

function inline(s: string): string {
  return s
    .replace(/\*\*([^*]+)\*\*/g, '<strong>$1</strong>')
    .replace(/\*([^*]+)\*/g, '<em>$1</em>')
    .replace(/==([^=]+)==/g, '<mark>$1</mark>')
    .replace(/`([^`]+)`/g, '<code>$1</code>')
}
