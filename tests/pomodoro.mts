process.on('unhandledRejection', (e) => { console.error('UNHANDLED', e); process.exit(1) })
const store = new Map<string, string>()
;(globalThis as any).localStorage = { getItem: (k: string) => store.get(k) ?? null, setItem: (k: string, v: string) => void store.set(k, v), removeItem: (k: string) => void store.delete(k), clear: () => store.clear() }
Object.defineProperty(globalThis, 'navigator', { value: { onLine: true }, configurable: true })
const { useFocus } = await import('/home/user/learn_wisely/src/stores/focus.ts')
const f = () => useFocus.getState()
const t = () => f().timer
// run 4 full pomodoro cycles
useFocus.setState((s) => ({ timer: { ...s.timer, mode: 'pomodoro', secondsLeft: 1500, cycle: 1, phase: 'work' } }))
for (let i = 0; i < 4; i++) {
  useFocus.setState((s) => ({ timer: { ...s.timer, running: true, endAt: Date.now() - 100 } }))
  f().tick()
  console.log(`after work cycle start-state ${i + 1}: phase=${t().phase} cycle=${t().cycle}/${f().settings.cycles} running=${t().running} left=${Math.round(t().secondsLeft/60)}m`)
  useFocus.setState((s) => ({ timer: { ...s.timer, endAt: Date.now() - 100 } }))
  f().tick()
  console.log(`  after break: phase=${t().phase} cycle=${t().cycle} running=${t().running}`)
}
