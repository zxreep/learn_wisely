/** Tiny WebAudio chimes — intentionally no asset files so they work offline. */
export function playChime(kind: 'work' | 'break' = 'work') {
  try {
    const ctx = new AudioContext()
    const notes = kind === 'work' ? [523.25, 659.25, 783.99] : [440, 523.25]
    notes.forEach((f, i) => {
      const osc = ctx.createOscillator()
      const g = ctx.createGain()
      osc.type = 'sine'
      osc.frequency.value = f
      const t = ctx.currentTime + i * 0.14
      g.gain.setValueAtTime(0.0001, t)
      g.gain.linearRampToValueAtTime(0.12, t + 0.02)
      g.gain.exponentialRampToValueAtTime(0.0001, t + 1.1)
      osc.connect(g)
      g.connect(ctx.destination)
      osc.start(t)
      osc.stop(t + 1.2)
    })
    setTimeout(() => void ctx.close(), 2200)
  } catch {
    /* no audio device */
  }
}
