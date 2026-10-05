/**
 * Wisely's on-device study assistant.
 *
 * Everything here runs locally with zero network calls, so the AI features
 * work fully offline. The engine uses classic extractive NLP heuristics:
 * term-frequency scoring, definition-pattern detection and cloze deletion.
 */
import { uid } from './utils'

const STOPWORDS = new Set(
  `a an the and or but if of at by for with about into through during before after above below to from up down in out on off over under again further then once here there when where why how all any both each few more most other some such no nor not only own same so than too very can will just should now is are was were be been being have has had having do does did doing would could ought i you he she it we they them his her its our their this that these those as what which who whom`.split(/\s+/),
)

/* ------------------------------ tokenizing ----------------------------- */
export function words(text: string): string[] {
  // words 3+ chars, plus 4-digit numbers so history/date queries work ("in 1789?")
  return (text.toLowerCase().match(/[a-z][a-z'-]{2,}|\b\d{4}\b/g) ?? []).filter((w) => !STOPWORDS.has(w))
}

export function splitSentences(text: string): string[] {
  return text
    .replace(/\[\[|\]\]/g, '')
    .replace(/[*_`#>]/g, '')
    .split(/(?<=[.!?])\s+|\n+/)
    .map((s) => s.trim())
    .filter((s) => s.length > 25 && s.length < 320)
}

export function keyTerms(text: string, n = 10): { term: string; count: number }[] {
  const freq = new Map<string, number>()
  for (const w of words(text)) {
    if (w.length < 4) continue
    freq.set(w, (freq.get(w) ?? 0) + 1)
  }
  return [...freq.entries()]
    .map(([term, count]) => ({ term, count }))
    .sort((a, b) => b.count - a.count || a.term.localeCompare(b.term))
    .slice(0, n)
}

/* ------------------------------ summarize ------------------------------ */
export function summarize(text: string, maxBullets = 4): string[] {
  const sentences = splitSentences(text)
  if (sentences.length === 0) return []
  if (sentences.length <= maxBullets) return sentences

  const freq = new Map<string, number>()
  for (const w of words(text)) freq.set(w, (freq.get(w) ?? 0) + 1)

  const scored = sentences.map((s, i) => {
    const ws = words(s)
    let score = ws.reduce((acc, w) => acc + (freq.get(w) ?? 0), 0) / Math.max(6, ws.length)
    // prefer opening sentences & definition-like sentences slightly
    if (i === 0) score *= 1.25
    if (/\b(is|are|refers to|means|defined as)\b/i.test(s)) score *= 1.15
    return { s, i, score }
  })
  return scored
    .sort((a, b) => b.score - a.score)
    .slice(0, maxBullets)
    .sort((a, b) => a.i - b.i)
    .map((x) => x.s)
}

/* --------------------------- flashcard factory -------------------------- */
export interface GenCard {
  front: string
  back: string
}

const DEF_RE = /^([A-Z][\w\s'()-]{2,60}?)\s+(?:is|are|was|were)\s+((?:a|an|the)\s+)?(.{19,220})$/
const MEANS_RE = /^([A-Z][\w\s'()-]{2,60}?)\s+(refers to|means|describes|denotes)\s+(.{15,220})$/
const CONSISTS_RE = /^([A-Z][\w\s'()-]{2,60}?)\s+(?:consists? of|includes?|comprises?|contains?)\s+(.{15,240})$/
const DATE_RE = /\b(1[5-9]\d{2}|20[0-2]\d)\b/

function cap(s: string) {
  return s.charAt(0).toUpperCase() + s.slice(1)
}

export function generateFlashcards(title: string, content: string, max = 8): GenCard[] {
  const cards: GenCard[] = []
  const seen = new Set<string>()
  const sentences = splitSentences(content)

  const push = (front: string, back: string) => {
    const k = front.toLowerCase()
    if (cards.length >= max || seen.has(k)) return
    seen.add(k)
    cards.push({ front, back })
  }

  for (const s of sentences) {
    const clean = s.replace(/\s+/g, ' ').trim()
    let m = clean.match(DEF_RE)
    if (m) {
      push(`What is ${m[1].toLowerCase()}?`, cap(`${m[1]} is ${m[2] ?? ''}${m[3]}`.replace(/\.\s*$/, '.')))
      continue
    }
    m = clean.match(MEANS_RE)
    if (m) {
      push(`What does “${m[1].toLowerCase()}” mean?`, cap(`${m[1]} ${m[2]} ${m[3]}`))
      continue
    }
    m = clean.match(CONSISTS_RE)
    if (m) {
      push(`What does ${m[1].toLowerCase()} include?`, cap(`${m[1]} includes ${m[2]}`))
      continue
    }
    const dt = clean.match(DATE_RE)
    if (dt && clean.length > 40) {
      const rest = clean.replace(/^.*?[a-z],?\s+(?=[A-Z])/, '')
      push(`What happened in ${dt[1]}?`, cap(rest))
      continue
    }
  }

  // Fill remaining slots with cloze deletions on key terms
  if (cards.length < max) {
    const terms = keyTerms(content, 12).filter((t) => !seen.has(t.term))
    for (const { term } of terms) {
      if (cards.length >= max) break
      const s = sentences.find((x) => x.toLowerCase().includes(term))
      if (!s) continue
      const blanked = s.replace(new RegExp(`\\b${term}\\b`, 'i'), '_____')
      if (blanked === s) continue
      push(`Fill the blank: “${blanked.trim()}”`, `${cap(term)} — from “${title}”`)
    }
  }
  return cards
}

/* -------------------------------- quizzes ------------------------------- */
export interface QuizQuestion {
  id: string
  prompt: string
  options: string[]
  answer: number
  source: string
}

export function quizFromCards(cards: { front: string; back: string; id?: string }[], n = 6): QuizQuestion[] {
  const pool = cards.filter((c) => c.back.length < 160)
  const shuffled = [...pool].sort(() => Math.random() - 0.5)
  const out: QuizQuestion[] = []
  for (const card of shuffled) {
    if (out.length >= n) break
    const distractors = pool
      .filter((c) => c.back !== card.back)
      .sort(() => Math.random() - 0.5)
      .slice(0, 3)
      .map((c) => c.back)
    if (distractors.length < 3) continue
    const options = [...distractors, card.back].sort(() => Math.random() - 0.5)
    out.push({
      id: uid('q'),
      prompt: card.front,
      options,
      answer: options.indexOf(card.back),
      source: 'Flashcards',
    })
  }
  return out
}

/* -------------------------------- explain ------------------------------- */
export function explain(term: string, corpus: { title: string; content: string }[]): string {
  const t = term.toLowerCase().trim()
  if (!t) return 'Type a term above and I’ll pull together what your library says about it.'
  const hits: { s: string; src: string }[] = []
  for (const doc of corpus) {
    for (const s of splitSentences(doc.content)) {
      if (s.toLowerCase().includes(t)) hits.push({ s, src: doc.title })
      if (hits.length >= 6) break
    }
    if (hits.length >= 6) break
  }
  if (hits.length === 0) {
    return `I couldn't find “${term}” anywhere in your library yet. Add a note that mentions it, and I’ll be able to explain it in your own words.`
  }
  const intro = `Here’s what your library says about **${term}**:`
  const bullets = hits.map((h) => `• ${h.s}  _(${h.src})_`).join('\n')
  return `${intro}\n${bullets}`
}

/* ------------------------------ ask (Q&A) ------------------------------- */
export interface AskResult {
  answer: string
  sources: { title: string; snippet: string }[]
}

export function ask(
  query: string,
  corpus: { title: string; content: string }[],
): AskResult {
  const qWords = new Set(words(query))
  if (qWords.size === 0) {
    return {
      answer: 'Ask me anything about your notes — I read everything in your library.',
      sources: [],
    }
  }
  const hits: { title: string; snippet: string; score: number }[] = []
  for (const doc of corpus) {
    for (const s of splitSentences(doc.content)) {
      const ws = words(s)
      let score = 0
      for (const w of ws) if (qWords.has(w)) score += 1
      if (score > 0) hits.push({ title: doc.title, snippet: s, score })
    }
  }
  hits.sort((a, b) => b.score - a.score)
  const top = hits.slice(0, 3)
  if (top.length === 0) {
    return {
      answer: `Nothing in your library mentions that yet. Try adding a note about it — everything you save becomes part of what I can search, even offline.`,
      sources: [],
    }
  }
  const answer =
    top.map((h) => `• ${h.snippet}`).join('\n') +
    `\n\nFound in ${top.length === 1 ? '1 source' : `${top.length} sources`} — see below.`
  return { answer, sources: top.map(({ title, snippet }) => ({ title, snippet })) }
}
