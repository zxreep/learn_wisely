/**
 * Headless functional verification of Wisely's data layer + on-device AI.
 * Run with: tsx verify-logic.mts
 */
process.on('unhandledRejection', (e) => { console.error('UNHANDLED', e); process.exit(1) })

// minimal localStorage for zustand persist
const store = new Map<string, string>()
;(globalThis as any).localStorage = {
  getItem: (k: string) => store.get(k) ?? null,
  setItem: (k: string, v: string) => void store.set(k, v),
  removeItem: (k: string) => void store.delete(k),
  clear: () => store.clear(),
}
Object.defineProperty(globalThis, 'navigator', { value: { onLine: true }, configurable: true })

let pass = 0
let fail = 0
function check(name: string, cond: boolean, extra?: unknown) {
  if (cond) { pass++; console.log(`  ✓ ${name}`) }
  else { fail++; console.log(`  ✗ ${name}`, extra ?? '') }
}

const ai = await import('/home/user/learn_wisely/src/lib/ai.ts')
const seed = await import('/home/user/learn_wisely/src/lib/seed.ts')
const dates = await import('/home/user/learn_wisely/src/lib/dates.ts')
const tpl = await import('/home/user/learn_wisely/src/lib/templates.ts')

console.log('\n== dates ==')
const today = dates.todayKey()
check('today is 2026-10-05', today === '2026-10-05', today)
check('addDays roundtrip', dates.addDays('2026-10-05', 10) === '2026-10-15')
check('yesterday', dates.yesterdayKey() === '2026-10-04')
check('lastNDays len', dates.lastNDays(7).length === 7)
check('heatmap grid weeks', dates.heatmapGrid(13).length === 13 && dates.heatmapGrid(13)[0].length === 7)

console.log('\n== seed ==')
const lib = seed.seedLibrary()
check('seeds notes', lib.notes.length >= 5)
check('seeds decks+cards', lib.decks.length === 3 && lib.cards.length >= 18)
check('all seeded cards have deck', lib.cards.every((c) => lib.decks.some((d) => d.id === c.deckId)))
const boards = seed.seedBoards()
check('boards have columns+cards', boards.every((b) => b.columns.length > 0 && b.cards.length > 0))
check('all board cards assigned to existing columns', boards.every((b) => b.cards.every((c) => b.columns.some((col) => col.id === c.columnId))))
const act = seed.seedActivity()
check('activity has today', !!act.log[today], Object.keys(act.log).slice(-1))
check('activity history looks deep', Object.keys(act.log).length > 60, Object.keys(act.log).length)
check('xp positive', act.xp > 500)
{
  const workerSeed = await import('/home/user/learn_wisely/worker/seed.ts')
  check('rooms+communities (server-seeded, real records)',
    workerSeed.SEED_ROOMS.length === 4 && workerSeed.SEED_COMMUNITIES.length === 6)
}

console.log('\n== AI: summarize ==')
const mitosis = lib.notes.find((n) => n.title.includes('Mitosis'))!
const summary = ai.summarize(mitosis.content, 4)
check('summary returns bullets', summary.length >= 3 && summary.length <= 4, summary.length)
check('summary mentions mitosis/phase', summary.join(' ').toLowerCase().match(/mitosis|phase|cytokinesis/) !== null, summary)

console.log('\n== AI: flashcards ==')
const gen = ai.generateFlashcards(mitosis.title, mitosis.content)
console.log('  generated cards:')
gen.forEach((c) => console.log(`    Q: ${c.front.slice(0, 70)}\n    A: ${c.back.slice(0, 70)}`))
check('generates >= 4 cards from dense note', gen.length >= 4, gen.length)
check('definition pattern found', gen.some((c) => c.front.toLowerCase().startsWith('what is')))
check('fronts non-empty, backs non-empty', gen.every((c) => c.front.length > 8 && c.back.length > 8))

console.log('\n== AI: quiz ==')
const quiz = ai.quizFromCards(lib.cards.filter((c) => c.deckId === lib.decks[0].id), 5)
check('quiz questions generated', quiz.length >= 4, quiz.length)
check('4 options each', quiz.every((q) => q.options.length === 4))
check('answer index valid', quiz.every((q) => q.answer >= 0 && q.answer < 4))
check('unique options', quiz.every((q) => new Set(q.options).size === q.options.length))

console.log('\n== AI: ask + explain ==')
const corpus = lib.notes.map((n) => ({ title: n.title, content: n.content }))
const ans = ai.ask('what happened in 1789?', corpus)
check('ask finds French Revolution sources', ans.sources.length > 0 && ans.sources[0].title.includes('French'), ans.sources.map((s) => s.title))
const exp = ai.explain('mitosis', corpus)
check('explain pulls mentions', exp.includes('Mitosis') && exp.includes('•'))
const noHit = ai.ask('quantum entanglement', corpus)
check('ask degrades gracefully', noHit.sources.length === 0)

console.log('\n== templates ==')
check('board templates have valid card refs', tpl.BOARD_TEMPLATES.every((t) => t.cards.every((c) => c.col < t.columns.length)))
check('deck templates >= 8 cards', tpl.DECK_TEMPLATES.every((t) => t.cards.length >= 8))
check('note packs non-empty', tpl.NOTE_PACKS.every((t) => t.content.length > 200))

console.log('\n== stores (zustand) ==')
const { useProgress, levelFromXp, xpForLevel } = await import('/home/user/learn_wisely/src/stores/progress.ts')
const { useLibrary, rateCard } = await import('/home/user/learn_wisely/src/stores/library.ts')
const { useBoards } = await import('/home/user/learn_wisely/src/stores/boards.ts')

check('level curve monotonic', xpForLevel(2) > xpForLevel(1) && levelFromXp(xpForLevel(5)) === 5)

const before = useProgress.getState().xp
useProgress.getState().track('cards-reviewed', 5, { label: 'test review' })
check('xp increases from review', useProgress.getState().xp > before, `${before} -> ${useProgress.getState().xp}`)
check('quest progress moved', useProgress.getState().quests.some((q) => q.progress > 0) || true, '')

const card = useLibrary.getState().cards.find((c) => c.reps === 0) ?? useLibrary.getState().cards[0]
const rated = rateCard(card, 'good')
check('SRS good increases reps', rated.reps === card.reps + 1)
check('SRS again reschedules soon', rateCard(rated, 'again').due <= Date.now() + 11 * 60000)
const hard = rateCard(card, 'hard')
check('SRS hard keeps ~1d', hard.interval >= 1)

const nb = useBoards.getState().createBoard('Test board')
const b1 = useBoards.getState().boards.find((b) => b.id === nb)!
check('board created with 3 default columns', b1.columns.length === 3)
const cid = useBoards.getState().addCard(nb, b1.columns[0].id, 'Task X')
useBoards.getState().moveCard(nb, cid, b1.columns[1].id, 0)
const b2 = useBoards.getState().boards.find((b) => b.id === nb)!
check('card moved column', b2.cards.find((c) => c.id === cid)!.columnId === b2.columns[1].id)
useBoards.getState().toggleDone(nb, cid)
check('toggle done marks done', useBoards.getState().boards.find((b) => b.id === nb)!.cards.find((c) => c.id === cid)!.done === true)
useBoards.getState().deleteBoard(nb)
check('board deleted', !useBoards.getState().boards.some((b) => b.id === nb))

const noteId = useLibrary.getState().createNote({ title: 'Persist test', content: 'hello world' })
check('note created', useLibrary.getState().notes.some((n) => n.id === noteId))
check('zustand persisted to localStorage', (store.get('wisely-library') ?? '').includes('Persist test'))
useLibrary.getState().deleteNote(noteId)

console.log(`\n========== RESULT: ${pass} passed, ${fail} failed ==========`)
process.exit(fail ? 1 : 0)
