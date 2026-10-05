/**
 * Server-side AI generation via the Groq API (free tier, OpenAI-compatible
 * chat completions). API key never leaves the worker — the client calls
 * POST /api/ai/generate and receives already-generated content.
 */
import type { AiGenerateRequest, AiGenerateResponse } from '../shared/api'

interface GroqMessage {
  role: 'system' | 'user'
  content: string
}

const SYSTEM = [
  'You are Wisely, a helpful AI study assistant embedded in a student study app.',
  'Be clear, accurate and student-friendly. Prefer short sentences, bullet points and examples.',
  'If asked for JSON, respond with VALID JSON only — no markdown fences, no commentary.',
].join('\n')

function buildPrompt(req: AiGenerateRequest): { messages: GroqMessage[]; json: boolean } {
  switch (req.mode) {
    case 'summarize': {
      const note = req.note
      return {
        json: false,
        messages: [
          { role: 'system', content: SYSTEM },
          {
            role: 'user',
            content: `Summarize the following study note titled "${note?.title ?? 'Untitled'}". Return a compact markdown summary: a 1-sentence TL;DR line starting with "TL;DR:", then 4-7 bullets of core concepts, then a short "Key terms" line with the most important terms bolded.\n\nNote:\n${(note?.content ?? '').slice(0, 12000)}`,
          },
        ],
      }
    }
    case 'flashcards': {
      const note = req.note
      return {
        json: true,
        messages: [
          { role: 'system', content: SYSTEM },
          {
            role: 'user',
            content: `From the study note titled "${note?.title ?? 'Untitled'}", create exactly 6 flashcards targeting the most important concepts. Respond as JSON: {"cards":[{"front":"question","back":"answer"}]}. Keep fronts short questions or cloze prompts and backs to one or two sentences.\n\nNote:\n${(note?.content ?? '').slice(0, 12000)}`,
          },
        ],
      }
    }
    case 'quiz': {
      const cards = req.cards ?? []
      const ctx =
        cards.length > 0
          ? `Flashcards from the deck "${req.deckTitle ?? 'Untitled deck'}":\n${cards.map((c) => `- Q: ${c.front} A: ${c.back}`).join('\n')}`
          : `Note "${req.note?.title ?? 'Untitled'}":\n${(req.note?.content ?? '').slice(0, 9000)}`
      return {
        json: true,
        messages: [
          { role: 'system', content: SYSTEM },
          {
            role: 'user',
            content: `Create exactly 4 multiple-choice questions from this study material. Respond as JSON: {"questions":[{"prompt":"...","options":["a","b","c","d"],"answer":0}]} where answer is the 0-based index of the correct option. Distractors must be plausible.\n\n${ctx}`,
          },
        ],
      }
    }
    case 'explain': {
      const corpus = (req.corpus ?? []).map((d) => `[${d.title}]\n${d.content.slice(0, 1500)}`).join('\n\n')
      return {
        json: false,
        messages: [
          { role: 'system', content: SYSTEM },
          {
            role: 'user',
            content: `Explain the concept "${req.query ?? ''}". Use this structure in markdown:\n## <term> — plain definition\n**Why it matters:** one sentence.\n**Analogy:** a concrete everyday analogy.\n**In practice:** one short example.\n**Watch out:** one common misconception.\n${corpus ? `Ground the explanation in these notes where relevant:\n${corpus}` : ''}`,
          },
        ],
      }
    }
    case 'ask': {
      const corpus = (req.corpus ?? []).map((d) => `[${d.title}]\n${d.content.slice(0, 2500)}`).join('\n\n')
      return {
        json: false,
        messages: [
          { role: 'system', content: SYSTEM },
          {
            role: 'user',
            content: `Answer the student's question using the notes provided. Use markdown with 3-5 bullets and a one-line takeaway starting with **Takeaway:**. If the notes are insufficient, say what is known generally and mark uncertain parts. At the end add a line "Sources:" listing the note titles you used.\n\nQuestion: ${req.query ?? ''}\n\nNotes:\n${corpus || '(no notes provided)'}`,
          },
        ],
      }
    }
  }
}

function stripJson(text: string): unknown {
  const cleaned = text.replace(/```(?:json)?/gi, '').trim()
  // find first { ... } span if there is extra chatter around it
  const start = cleaned.indexOf('{')
  const end = cleaned.lastIndexOf('}')
  const candidate = start >= 0 && end > start ? cleaned.slice(start, end + 1) : cleaned
  return JSON.parse(candidate)
}

export interface GroqEnv {
  GROQ_API_KEY: string
  GROQ_MODEL?: string
}

export async function generateAi(env: GroqEnv, req: AiGenerateRequest): Promise<AiGenerateResponse> {
  const model = env.GROQ_MODEL || 'llama-3.3-70b-versatile'
  const { messages, json } = buildPrompt(req)

  const res = await fetch('https://api.groq.com/openai/v1/chat/completions', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${env.GROQ_API_KEY}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      model,
      messages,
      temperature: 0.4,
      max_tokens: 1400,
      ...(json ? { response_format: { type: 'json_object' } } : {}),
    }),
  })

  if (!res.ok) {
    const body = await res.text().catch(() => '')
    throw new Error(`Groq error ${res.status}: ${body.slice(0, 200)}`)
  }

  const payload = (await res.json()) as { choices?: { message?: { content?: string } }[] }
  const content = payload.choices?.[0]?.message?.content ?? ''

  if (req.mode === 'flashcards') {
    const parsed = stripJson(content) as { cards?: { front?: string; back?: string }[] }
    const cards = (parsed.cards ?? [])
      .filter((c) => c.front && c.back)
      .map((c) => ({ front: String(c.front), back: String(c.back) }))
    return { engine: 'groq', model, mode: req.mode, cards }
  }
  if (req.mode === 'quiz') {
    const parsed = stripJson(content) as { questions?: { prompt?: string; options?: string[]; answer?: number }[] }
    const questions = (parsed.questions ?? [])
      .filter((q) => q.prompt && Array.isArray(q.options) && q.options.length >= 2)
      .map((q) => ({
        prompt: String(q.prompt),
        options: q.options!.map(String),
        answer: Math.min(Math.max(0, Number(q.answer) || 0), q.options!.length - 1),
      }))
    return { engine: 'groq', model, mode: req.mode, questions }
  }
  return { engine: 'groq', model, mode: req.mode, text: content }
}
