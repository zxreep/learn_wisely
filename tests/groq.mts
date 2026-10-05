import { generateAi } from '/home/user/learn_wisely/worker/ai.ts'
let pass = 0, fail = 0
const ok = (c: unknown, l: string) => { c ? (pass++, console.log('  ok:', l)) : (fail++, console.error('  FAIL:', l)) }

let lastReq: any = null
;(globalThis as any).fetch = async (url: string, init: any) => {
  lastReq = { url, init: { ...init, body: JSON.parse(init.body) } }
  const json = lastReq.init.body.response_format?.type === 'json_object'
  return new Response(JSON.stringify({
    choices: [{ message: { content: json ? '```json\n{"cards":[{"front":"What is mitosis?","back":"Cell division."}]}```' : '**Summary** of notes' } }],
  }))
}

const out = await generateAi({ GROQ_API_KEY: 'gsk_test', GROQ_MODEL: 'llama-3.3-70b-versatile' }, {
  mode: 'flashcards', note: { title: 'Mitosis', content: 'Mitosis is cell division: prophase, metaphase, anaphase, telophase.' },
})
ok(lastReq.url === 'https://api.groq.com/openai/v1/chat/completions', 'hits Groq chat completions API')
ok(lastReq.init.headers.Authorization === 'Bearer gsk_test', 'sends API key as bearer')
ok(lastReq.init.body.model === 'llama-3.3-70b-versatile', 'model configurable')
ok(lastReq.init.body.response_format?.type === 'json_object', 'flashcards uses json mode')
ok(lastReq.init.body.messages[0].role === 'system' && lastReq.init.body.messages.length === 2, 'system+user message shape')
ok(lastReq.init.body.messages[1].content.includes('Mitosis is cell division'), 'note content is included in prompt')
ok(out.engine === 'groq' && out.cards?.[0]?.front === 'What is mitosis?', 'fenced JSON parsed into card array')

const sum = await generateAi({ GROQ_API_KEY: 'k' }, { mode: 'summarize', note: { title: 'X', content: 'Y' } })
ok(sum.text?.includes('Summary'), 'summary text passes through')
ok(lastReq.init.body.model === 'llama-3.3-70b-versatile' && !lastReq.init.body.model.includes('undefined'), 'default model when env missing')
;(globalThis as any).fetch = async () => new Response('boom', { status: 500 })
let threw = false
try { await generateAi({ GROQ_API_KEY: 'k' }, { mode: 'summarize' }) } catch { threw = true }
ok(threw, 'non-200 surfaces as thrown error (app maps to 502)')

console.log(`\nGroq: ${pass} passed, ${fail} failed`)
if (fail) process.exit(1)
