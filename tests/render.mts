/**
 * Render verification.
 *
 * Part A — SSR smoke: server-render <App/> on every route inside jsdom and
 * assert meaningful markup (catches render-time crashes).
 *
 * Part B — client e2e: mount <App/> with react-dom/createRoot against the
 * REAL Worker API (hono app + MemoryStorage) shimmed as global fetch, and
 * assert the live community room, guest chat wall and the signed-in
 * message+/presence round-trip.
 *
 * Run: TSX_TSCONFIG_PATH=$PWD/tsconfig.app.json npx tsx tests/render.mts
 */
process.on('unhandledRejection', (e) => { console.error('UNHANDLED', e); process.exit(1) })

import { JSDOM } from 'jsdom'

const dom = new JSDOM('<!doctype html><html><body></body></html>', {
  url: 'http://localhost:5173/',
  pretendToBeVisual: true,
})

const w = dom.window as unknown as Record<string, unknown>
const g = globalThis as Record<string, unknown>
for (const key of [
  'window', 'document', 'localStorage', 'sessionStorage', 'HTMLElement', 'Node',
  'Element', 'CustomEvent', 'Event', 'KeyboardEvent', 'MouseEvent', 'getComputedStyle',
  'requestAnimationFrame', 'cancelAnimationFrame', 'DocumentFragment', 'MutationObserver',
  'SVGElement', 'HTMLInputElement', 'HTMLTextAreaElement', 'FileReader', 'Blob', 'URL',
]) {
  if (w[key] !== undefined && g[key] === undefined) g[key] = w[key]
}
Object.defineProperty(globalThis, 'navigator', { value: w.navigator, configurable: true })
if (!g.matchMedia) {
  ;(g.window as any).matchMedia = (q: string) => ({
    matches: false, media: q, addEventListener() { }, removeEventListener() { }, addListener() { }, removeListener() { }, onchange: null, dispatchEvent: () => false,
  })
}
;(g as any).IS_REACT_ACT_ENVIRONMENT = true
// jsdom doesn't implement scroll scrollTo on elements w/o layout
if (w.HTMLElement) {
  ;(w.HTMLElement.prototype as any).scrollTo = function scrollTo() { }
  ;(w.HTMLElement.prototype as any).scrollBy = function scrollBy() { }
}

import { createRequire } from 'module'
const require = createRequire('/home/user/learn_wisely/package.json')
const React: typeof import('react') = require('react')
const { renderToString }: typeof import('react-dom/server') = require('react-dom/server')

/* ------------------- real API shim (in-process, memory store) ----------- */
const { buildApp } = await import('/home/user/learn_wisely/worker/app.ts')
const { MemoryStorage } = await import('/home/user/learn_wisely/worker/storage.ts')
const apiApp = buildApp(new MemoryStorage(), {})
;(g as any).fetch = (input: unknown, init?: RequestInit) => {
  const href = new URL(typeof input === 'string' ? input : (input as Request).url, 'http://wisely.test')
  return apiApp.fetch(new Request(href, init))
}

const { default: App } = await import('/home/user/learn_wisely/src/App.tsx')
const { useLibrary } = await import('/home/user/learn_wisely/src/stores/library.ts')
const { useBoards } = await import('/home/user/learn_wisely/src/stores/boards.ts')

let pass = 0
let fail = 0
function check(name: string, cond: boolean, extra?: unknown) {
  if (cond) { pass++; console.log(`  ✓ ${name}`) }
  else { fail++; console.log(`  ✗ ${name}`, extra ?? '') }
}

const lib = useLibrary.getState()
const boards = useBoards.getState()
const noteId = lib.notes[0].id
const deckId = lib.decks[0].id
const boardId = boards.boards[0].id

/* ------------------------------- Part A --------------------------------- */
const routes: { path: string; expect: string[] }[] = [
  { path: '/', expect: ['Good', 'Dashboard', 'quest', 'streak'] },
  { path: '/boards', expect: ['Study boards', 'Semester plan', 'New board'] },
  { path: `/boards/${boardId}`, expect: ['Add column', 'Backlog'] },
  { path: '/library', expect: ['Library', 'Mitosis', 'Flashcards'] },
  { path: `/library?note=${noteId}`, expect: ['All changes save automatically', 'word', 'Summarize'] },
  { path: `/library?deck=${deckId}`, expect: ['Study', 'Add a card', 'Front'] },
  { path: '/focus', expect: ['Focus mode', 'Pomodoro', 'Soundscape', '25:00'] },
  { path: '/progress', expect: ['Progress', 'Quests', 'Badges', 'XP feed'] },
  { path: '/discover', expect: ['Discover', 'Curated study starter packs'] },
  { path: '/settings', expect: ['Settings', 'Account', 'Sync'] },
  { path: '/community', expect: ['Communities', 'Study rooms', 'Leaderboard'] },
  { path: '/no-such-page', expect: ['This page flew away'] },
]

for (const r of routes) {
  try {
    dom.window.history.pushState({}, '', r.path)
    const html = renderToString(React.createElement(App))
    const missing = r.expect.filter((e) => !html.toLowerCase().includes(e.toLowerCase()))
    check(`${r.path} renders (${html.length}b)`, missing.length === 0, missing.length ? `missing: ${missing.join(', ')}` : undefined)
  } catch (err) {
    check(`${r.path} renders`, false, String(err).slice(0, 300))
  }
}

/* ------------------------------- Part B --------------------------------- */
const { createRoot }: typeof import('react-dom/client') = require('react-dom/client')
const { act }: typeof import('react-dom/test-utils') = require('react-dom/test-utils')

async function mount(
  path: string,
  waitMs = 350,
): Promise<{ html: () => string; dispose: () => Promise<void> }> {
  dom.window.history.pushState({}, '', path)
  const container = document.createElement('div')
  document.body.appendChild(container)
  const root = createRoot(container)
  await act(async () => {
    root.render(React.createElement(App))
    await new Promise((r) => setTimeout(r, waitMs))
  })
  return {
    html: () => container.innerHTML,
    dispose: async () => {
      await act(async () => {
        root.unmount()
      })
      container.remove()
    },
  }
}

try {
  // Guest sees real server-seeded rooms; chat asks politely for a sign-in.
  const guestRoom = await mount('/community?room=r_focus')
  const g = guestRoom.html()
  check('client: server-seeded room renders', g.includes('Deep Focus Den'), g.slice(0, 200))
  check('client: live presence section renders', g.includes('In the room'))
  check('client: empty room honesty', g.includes('first soul in it') || g.includes('The room is empty'))
  check('client: guest chat wall renders', g.includes('Sign in to chat'))
  check('client: guest focus-in-room action rendered', g.includes('Focus in this room'))
  await guestRoom.dispose()

  const guestHome = await mount('/community')
  const gHome = guestHome.html()
  check('client: guest home shows auth wall', gHome.includes('Sign in to participate'))
  // communities seed is server-side; the rooms grid (default tab) proves it round-trips into the UI
  check('client: server-seeded rooms render on home', gHome.includes('Exam Crunch HQ') || gHome.includes('Midnight Library'))
  await guestHome.dispose()

  // Sign up through the real API, then chat + presence flow through the UI store.
  const { useAuth } = await import('/home/user/learn_wisely/src/stores/auth.ts')
  const okSignup = await useAuth.getState().signup('Ria of the Pines', 'pass1234', '#2f7a57')
  check('client: signup through shimmed API', okSignup && !!useAuth.getState().token)

  const { useCommunity } = await import('/home/user/learn_wisely/src/stores/community.ts')
  const joined = await apiApp.fetch(
    new Request('http://wisely.test/api/communities/c_bio/join', {
      method: 'POST',
      headers: { 'content-type': 'application/json', authorization: `Bearer ${useAuth.getState().token}` },
    }),
  )
  check('client: join community via API', joined.status === 200)
  await useCommunity.getState().fetchCommunities()
  check('client: communities refreshed with membership', useCommunity.getState().communities.some((c) => c.id === 'c_bio' && c.joined && c.memberCount === 1))

  await mount('/community?room=r_focus')
  const authed = await mount('/community?room=r_focus', 400)
  const html = authed.html()
  check('client: chat input available when signed in', html.includes(`Message Deep Focus Den`))

  await useCommunity.getState().sendMessage('r_focus', 'Real message through the worker!')
  const msgs = useCommunity.getState().roomCache['r_focus']?.messages ?? []
  check('client: message stored through API', msgs.some((m) => m.text.includes('Real message') && m.who === 'Ria of the Pines'))
  const after = await authed.html()
  check('client: message rendered in room chat', after.includes('Real message through the worker!'))

  await useCommunity.getState().heartbeat('r_focus', { subject: 'Biology 101', focusing: true })
  await useCommunity.getState().pollRoom('r_focus')
  const h = authed.html()
  check('client: presence list shows me via heartbeat', h.includes('Biology 101'), h.length)
  await authed.dispose()

  const board = await apiApp.fetch(new Request('http://wisely.test/api/leaderboard'))
  const boardJson: any = await board.json()
  check('client: leaderboard reachable', Array.isArray(boardJson.leaderboard))
} catch (err) {
  check('client e2e completed', false, String(err).slice(0, 400))
}

console.log(`\n========== RESULT: ${pass} passed, ${fail} failed ==========`)
process.exit(fail ? 1 : 0)
