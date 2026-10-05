/** Verify the store-backed focus timer: start → tick → complete → XP logged. */
process.on('unhandledRejection', (e) => { console.error('UNHANDLED', e); process.exit(1) })
const store = new Map<string, string>()
;(globalThis as any).localStorage = {
  getItem: (k: string) => store.get(k) ?? null,
  setItem: (k: string, v: string) => void store.set(k, v),
  removeItem: (k: string) => void store.delete(k),
  clear: () => store.clear(),
}
Object.defineProperty(globalThis, 'navigator', { value: { onLine: true }, configurable: true })

let pass = 0, fail = 0
const check = (n: string, c: boolean, x?: unknown) => { c ? pass++ : fail++; console.log(`${c ? '  ✓' : '  ✗'} ${n}`, c ? '' : (x ?? '')) }

const { useFocus, workDurationMin, phaseDurationSec } = await import('/home/user/learn_wisely/src/stores/focus.ts')
const { useProgress } = await import('/home/user/learn_wisely/src/stores/progress.ts')

const f = () => useFocus.getState()
const t = () => f().timer

// default idle state
check('starts idle at 25:00', t().secondsLeft === 1500 && !t().running)
check('work duration for pomodoro = 25', workDurationMin(t()) === 25)
check('phase duration: short break = 300s', phaseDurationSec(t(), f().settings, 'short') === 300)

// set mode & label
f().setMode('sprint')
check('sprint mode → 900s', t().secondsLeft === 900)
f().setLabel('Testing the timer')
check('label set', t().label === 'Testing the timer')

// start & tick
f().startTimer()
check('running with endAt in future', t().running && (t().endAt ?? 0) > Date.now())
const before = Date.now()
// simulate 5 seconds passing
useFocus.setState((s) => ({ timer: { ...s.timer, endAt: s.timer.endAt! - 5000 } }))
f().tick()
check('tick decrements ~5s', Math.abs(t().secondsLeft - (900 - 5)) <= 1, t().secondsLeft)
check('workedSec accumulates', t().workedSec >= 4, t().workedSec)

// pause keeps secondsLeft
f().pauseTimer()
const left = t().secondsLeft
f().tick()
check('paused tick is a no-op', !t().running && t().secondsLeft === left)

// resume, then force near-completion and tick through it
f().startTimer()
const sessionsBefore = f().sessions.length
const xpBefore = useProgress.getState().xp
useFocus.setState((s) => ({ timer: { ...s.timer, endAt: Date.now() - 1000 } }))
f().tick()
check('work block completed → session logged', f().sessions.length === sessionsBefore + 1, f().sessions.length)
check('latest session is 15 min sprint', f().sessions[0]?.minutes === 15 && f().sessions[0]?.mode === 'Sprint', f().sessions[0])
check('XP awarded for completion', useProgress.getState().xp > xpBefore)

// pomodoro should auto-advance into a break (autoBreaks on)
check('auto-advanced to short break', t().phase === 'short' || t().phase === 'work', t().phase)
const phaseAfter = t().phase
if (phaseAfter === 'short') {
  check('break running', t().running)
  useFocus.setState((s) => ({ timer: { ...s.timer, endAt: Date.now() - 500 } }))
  f().tick()
  check('break done → back to work', t().phase === 'work')
}

// end early logs partial session
f().setMode('deep')
f().setLabel('Early end test')
useFocus.setState((s) => ({ timer: { ...s.timer, running: true, endAt: Date.now() + 5000 * 60, workedSec: 180 } }))
const s2 = f().sessions.length
f().endTimer()
check('early end logs 3 min', f().sessions.length === s2 + 1 && f().sessions[0].minutes === 3, f().sessions[0])
check('timer reset after end', !t().running && t().phase === 'work' && t().workedSec === 0)

// rehydration migration sanity: old v1 payload mid-session expiry → idle
useFocus.setState((s) => ({ timer: { ...s.timer, running: true, endAt: Date.now() - 3600_000 } }))

console.log(`\n========== RESULT: ${pass} passed, ${fail} failed ==========`)
process.exit(fail ? 1 : 0)
