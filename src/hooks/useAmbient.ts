import { useEffect, useRef, useState, useCallback } from 'react'

/**
 * Generative ambient soundscapes via WebAudio — no audio files needed,
 * so they work offline forever. Rain = filtered white noise with droplet
 * ticks; Brown = low-frequency brown noise; Forest = slow-modulated pink-ish.
 */
export type AmbientKind = 'rain' | 'brown' | 'forest' | 'off'

interface AmbientNodes {
  ctx: AudioContext
  gain: GainNode
  sources: AudioBufferSourceNode[]
  timers: number[]
}

function makeNoiseBuffer(ctx: AudioContext, color: 'white' | 'brown'): AudioBuffer {
  const len = ctx.sampleRate * 4
  const buf = ctx.createBuffer(1, len, ctx.sampleRate)
  const data = buf.getChannelData(0)
  let last = 0
  for (let i = 0; i < len; i++) {
    const white = Math.random() * 2 - 1
    if (color === 'brown') {
      last = (last + 0.02 * white) / 1.02
      data[i] = last * 3.5
    } else {
      data[i] = white
    }
  }
  return buf
}

export function useAmbient() {
  const [kind, setKind] = useState<AmbientKind>('off')
  const [volume, setVolume] = useState(0.5)
  const nodesRef = useRef<AmbientNodes | null>(null)

  const stop = useCallback(() => {
    const n = nodesRef.current
    if (!n) return
    n.timers.forEach((t) => window.clearInterval(t))
    n.sources.forEach((s) => {
      try { s.stop() } catch { /* already stopped */ }
    })
    n.gain.disconnect()
    void n.ctx.close().catch(() => undefined)
    nodesRef.current = null
  }, [])

  const start = useCallback((k: AmbientKind, vol: number) => {
    stop()
    if (k === 'off') return
    const ctx = new AudioContext()
    const gain = ctx.createGain()
    gain.gain.value = 0
    gain.connect(ctx.destination)

    const sources: AudioBufferSourceNode[] = []
    const timers: number[] = []

    const addSource = (buf: AudioBuffer, filters: BiquadFilterNode[], gainVal: number) => {
      const src = ctx.createBufferSource()
      src.buffer = buf
      src.loop = true
      let node: AudioNode = src
      for (const f of filters) node = node.connect(f)
      const g = ctx.createGain()
      g.gain.value = gainVal
      node.connect(g)
      g.connect(gain)
      src.start()
      sources.push(src)
    }

    const white = makeNoiseBuffer(ctx, 'white')
    const brown = makeNoiseBuffer(ctx, 'brown')

    if (k === 'rain') {
      const lp = ctx.createBiquadFilter(); lp.type = 'lowpass'; lp.frequency.value = 1400
      const hp = ctx.createBiquadFilter(); hp.type = 'highpass'; hp.frequency.value = 300
      addSource(white, [lp, hp], 0.5)
      addSource(brown, [], 0.35)
      // droplet ticks
      timers.push(window.setInterval(() => {
        if (Math.random() > 0.45) return
        const osc = ctx.createOscillator()
        const g = ctx.createGain()
        osc.type = 'sine'
        osc.frequency.value = 700 + Math.random() * 900
        g.gain.setValueAtTime(0.0, ctx.currentTime)
        g.gain.linearRampToValueAtTime(0.05 * vol, ctx.currentTime + 0.005)
        g.gain.exponentialRampToValueAtTime(0.0001, ctx.currentTime + 0.09)
        osc.connect(g); g.connect(gain)
        osc.start(); osc.stop(ctx.currentTime + 0.1)
      }, 140))
    } else if (k === 'brown') {
      const lp = ctx.createBiquadFilter(); lp.type = 'lowpass'; lp.frequency.value = 420
      addSource(brown, [lp], 0.85)
    } else if (k === 'forest') {
      const bp = ctx.createBiquadFilter(); bp.type = 'bandpass'; bp.frequency.value = 900; bp.Q.value = 0.6
      addSource(white, [bp], 0.22)
      const lp = ctx.createBiquadFilter(); lp.type = 'lowpass'; lp.frequency.value = 300
      addSource(brown, [lp], 0.4)
      // occasional bird chirp
      timers.push(window.setInterval(() => {
        if (Math.random() > 0.12) return
        const osc = ctx.createOscillator()
        const g = ctx.createGain()
        osc.type = 'sine'
        const base = 1800 + Math.random() * 1200
        osc.frequency.setValueAtTime(base, ctx.currentTime)
        osc.frequency.exponentialRampToValueAtTime(base * 1.4, ctx.currentTime + 0.08)
        osc.frequency.exponentialRampToValueAtTime(base * 0.9, ctx.currentTime + 0.16)
        g.gain.setValueAtTime(0.0001, ctx.currentTime)
        g.gain.linearRampToValueAtTime(0.03 * vol, ctx.currentTime + 0.03)
        g.gain.exponentialRampToValueAtTime(0.0001, ctx.currentTime + 0.22)
        osc.connect(g); g.connect(gain)
        osc.start(); osc.stop(ctx.currentTime + 0.25)
      }, 2600))
    }

    // gentle fade-in
    gain.gain.linearRampToValueAtTime(vol * 0.6, ctx.currentTime + 1.2)
    nodesRef.current = { ctx, gain, sources, timers }
  }, [stop])

  // react to kind/volume changes
  useEffect(() => {
    const n = nodesRef.current
    if (kind === 'off') { stop(); return }
    if (!n) { start(kind, volume); return }
    n.gain.gain.setTargetAtTime(volume * 0.6, n.ctx.currentTime, 0.2)
  }, [kind, volume, start, stop])

  useEffect(() => stop, [stop])

  return { kind, setKind, volume, setVolume, playing: kind !== 'off' }
}
