/**
 * AI engine routing: Groq cloud first (server-held key via the Worker API),
 * automatic fall-through to the on-device NLP engine (lib/ai.ts) when the
 * server says unavailable, the network is down, or the user is a guest.
 */
import { api, ApiError } from './api'
import { words } from './ai'
import type { AiDoc, AiGenerateRequest, AiGenerateResponse } from '../../shared/api'

export type Engine = 'groq' | 'on-device'

/** Fire a Groq request; resolve to null when unavailable so callers can fall back locally. */
export async function tryGroq(req: AiGenerateRequest): Promise<AiGenerateResponse | null> {
  try {
    return await api.aiGenerate(req)
  } catch (err) {
    // deliberate fall-through — offline / not configured / rate limited
    if (err instanceof ApiError && err.status !== 429) {
      // silent; callers render the on-device path
    }
    return null
  }
}

/**
 * Rank the user's library for grounding and clip each note — keeps worker
 * payloads far under the 1.4 MB cap and the prompt under cheap-token sizes.
 */
export function pickCorpus(query: string, docs: AiDoc[], max = 6, clip = 1600): AiDoc[] {
  const qw = [...new Set(words(query))]
  const scored = docs.map((d) => {
    const text = `${d.title} ${d.content}`.toLowerCase()
    let score = 0
    for (const w of qw) if (text.includes(w)) score += 1
    return { d, score }
  })
  const top = scored.sort((a, b) => b.score - a.score).filter((s) => s.score > 0).slice(0, max)
  const chosen = top.length > 0 ? top : scored.slice(0, 3)
  return chosen.map((s) => ({ title: s.d.title, content: s.d.content.slice(0, clip) }))
}
