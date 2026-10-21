import { useSyncExternalStore } from 'react'
import { BANDS, BPM, S } from './model'

export type AudioMode = 'off' | 'mic' | 'demo' | 'file'

export interface AudioSettings {
  lfoHz: number 
  gain: number 
  smooth: number 
}

export class AudioEngine {
  mode: AudioMode = 'off'
  hear = false
  private subs = new Set<() => void>()
  private snap = 'off|0'
  private lastSample = 0
  private t0 = performance.now()
  subscribe = (f: () => void) => { this.subs.add(f); return () => { this.subs.delete(f) } }
  getSnapshot = () => this.snap
  settings: AudioSettings = { lfoHz: BPM / 60 / 4, gain: 1, smooth: 0.55 }
  fileName = ''
  private el: HTMLAudioElement | null = null
  private lfoPhase = 0
  private lastT = 0
  private emit() {
    const st = this.settings
    this.snap = `${this.mode}|${this.hear ? 1 : 0}|${st.lfoHz.toFixed(2)}|${st.gain.toFixed(2)}|${st.smooth.toFixed(2)}|${this.fileName}`
    this.subs.forEach((f) => f())
  }
  set(patch: Partial<AudioSettings>) { this.settings = { ...this.settings, ...patch }; this.emit() }

  ctx: AudioContext | null = null
  analyser: AnalyserNode | null = null
  private out: GainNode | null = null
  private stream: MediaStream | null = null
  private timer = 0
  freq = new Uint8Array(1024)
  wave = new Uint8Array(2048).fill(128)
  sources = new Array(9).fill(0) as number[]
  pulse = 0
  private peaks = BANDS.map(() => 0.05)
  private smooth = BANDS.map(() => 0)
  private prevKick = 0
  private flux = 0
  private onset = 0

  get live() { return !!this.analyser }

  private graph() {
    const ctx = new AudioContext()
    const analyser = ctx.createAnalyser()
    analyser.fftSize = 2048
    analyser.smoothingTimeConstant = 0.55
    const out = ctx.createGain()
    out.gain.value = 0
    analyser.connect(out).connect(ctx.destination)
    this.ctx = ctx; this.analyser = analyser; this.out = out
    this.freq = new Uint8Array(analyser.frequencyBinCount)
    this.wave = new Uint8Array(analyser.fftSize)
    return { ctx, analyser }
  }

  stop() {
    const was = this.mode
    this.mode = 'off'
    clearInterval(this.timer)
    this.stream?.getTracks().forEach((t) => t.stop())
    this.stream = null
    if (this.el) { this.el.pause(); URL.revokeObjectURL(this.el.src); this.el = null }
    this.fileName = ''
    this.ctx?.close().catch(() => {})
    this.ctx = null; this.analyser = null; this.out = null
    this.wave.fill(128); this.freq.fill(0)
    if (was !== 'off') this.emit()
  }

  setHear(on: boolean) {
    this.hear = on
    if (this.out && this.ctx) this.out.gain.setTargetAtTime(on && this.mode === 'demo' ? 0.6 : 0, this.ctx.currentTime, 0.05)
    this.emit()
  }

  async startMic() {
    this.stop()
    const stream = await navigator.mediaDevices.getUserMedia({
      audio: { echoCancellation: false, noiseSuppression: false, autoGainControl: false },
    })
    this.stream = stream
    const { ctx, analyser } = this.graph()
    ctx.createMediaStreamSource(stream).connect(analyser)
    this.mode = 'mic'; this.hear = false
    this.emit()
  }

  async startFile(file: File) {
    this.stop()
    const el = new Audio()
    el.src = URL.createObjectURL(file)
    el.loop = true
    el.crossOrigin = 'anonymous'
    const { ctx, analyser } = this.graph()
    const src = ctx.createMediaElementSource(el)
    src.connect(analyser)
    src.connect(ctx.destination)
    this.el = el
    this.fileName = file.name
    this.mode = 'file'; this.hear = true
    await el.play()
    this.emit()
  }

  startDemo() {
    this.stop()
    const { ctx, analyser } = this.graph()
    const bus = ctx.createGain(); bus.gain.value = 0.7; bus.connect(analyser)
    const noise = ctx.createBuffer(1, ctx.sampleRate, ctx.sampleRate)
    const d = noise.getChannelData(0)
    for (let i = 0; i < d.length; i++) d[i] = Math.random() * 2 - 1
    const kick = (t: number) => {
      const o = ctx.createOscillator(), g = ctx.createGain()
      o.frequency.setValueAtTime(150, t); o.frequency.exponentialRampToValueAtTime(42, t + 0.18)
      g.gain.setValueAtTime(1, t); g.gain.exponentialRampToValueAtTime(0.001, t + 0.35)
      o.connect(g).connect(bus); o.start(t); o.stop(t + 0.36)
    }
    const hat = (t: number, len = 0.05) => {
      const s = ctx.createBufferSource(), f = ctx.createBiquadFilter(), g = ctx.createGain()
      s.buffer = noise; f.type = 'highpass'; f.frequency.value = 8000
      g.gain.setValueAtTime(0.35, t); g.gain.exponentialRampToValueAtTime(0.001, t + len)
      s.connect(f).connect(g).connect(bus); s.start(t); s.stop(t + len + 0.01)
    }
    const snare = (t: number) => {
      const s = ctx.createBufferSource(), f = ctx.createBiquadFilter(), g = ctx.createGain()
      s.buffer = noise; f.type = 'bandpass'; f.frequency.value = 1800; f.Q.value = 0.7
      g.gain.setValueAtTime(0.7, t); g.gain.exponentialRampToValueAtTime(0.001, t + 0.18)
      s.connect(f).connect(g).connect(bus); s.start(t); s.stop(t + 0.2)
      const o = ctx.createOscillator(), og = ctx.createGain()
      o.frequency.value = 210; og.gain.setValueAtTime(0.4, t); og.gain.exponentialRampToValueAtTime(0.001, t + 0.1)
      o.connect(og).connect(bus); o.start(t); o.stop(t + 0.12)
    }
    const BASS = [55, 55, 65.4, 49]
    const bass = (t: number, step: number) => {
      const o = ctx.createOscillator(), f = ctx.createBiquadFilter(), g = ctx.createGain()
      o.type = 'sawtooth'; o.frequency.value = BASS[Math.floor(step / 16) % 4]
      f.type = 'lowpass'; f.frequency.setValueAtTime(900, t); f.frequency.exponentialRampToValueAtTime(140, t + 0.2)
      g.gain.setValueAtTime(0.28, t); g.gain.exponentialRampToValueAtTime(0.001, t + 0.24)
      o.connect(f).connect(g).connect(bus); o.start(t); o.stop(t + 0.25)
    }
    const lead = (t: number, step: number) => {
      const notes = [880, 1046.5, 1318.5, 1174.7]
      const o = ctx.createOscillator(), g = ctx.createGain()
      o.type = 'square'; o.frequency.value = notes[(step / 2) % 4 | 0]
      g.gain.setValueAtTime(0.06, t); g.gain.exponentialRampToValueAtTime(0.001, t + 0.12)
      o.connect(g).connect(bus); o.start(t); o.stop(t + 0.13)
    }
    const stepDur = 60 / BPM / 4
    let step = 0, next = ctx.currentTime + 0.05
    const schedule = () => {
      while (next < ctx.currentTime + 0.12) {
        const s = step % 16
        if (s % 4 === 0) kick(next)
        if (s === 4 || s === 12) snare(next)
        if (s % 2 === 1) hat(next)
        if (s === 14) hat(next, 0.18)
        if (s % 4 === 2 || s === 3) bass(next, step)
        if (step % 32 >= 16 && s % 3 === 0) lead(next, step)
        next += stepDur; step++
      }
    }
    schedule()
    this.timer = window.setInterval(schedule, 25)
    this.mode = 'demo'
    this.setHear(this.hear)
  }

  sample() {
    const now = performance.now()
    if (now - this.lastSample < 8) return this.sources
    this.lastSample = now
    return this.update((now - this.t0) / 1000)
  }

  update(t: number) {
    const an = this.analyser
    let bands: number[]
    if (an) {
      an.getByteFrequencyData(this.freq)
      an.getByteTimeDomainData(this.wave)
      const binHz = (this.ctx?.sampleRate ?? 48000) / an.fftSize
      bands = BANDS.map((b, i) => {
        const lo = Math.max(1, Math.floor(b.lo / binHz)), hi = Math.min(this.freq.length - 1, Math.ceil(b.hi / binHz))
        let sum = 0
        for (let k = lo; k <= hi; k++) sum += this.freq[k]
        const e = sum / (hi - lo + 1) / 255
        this.peaks[i] = Math.max(e, this.peaks[i] * 0.997, 0.05)
        return Math.min(1, (e / this.peaks[i]) * this.settings.gain)
      })
    } else {
      bands = this.smooth.map((v) => v * 0.9)
    }
    const k = this.settings.smooth
    bands.forEach((v, i) => { this.smooth[i] = this.smooth[i] * k + v * (1 - k) })
    const rise = this.smooth[S.KICK] - this.prevKick
    this.flux = this.flux * 0.9 + Math.max(0, rise) * 0.1
    if (an && rise * this.settings.gain > Math.max(0.18, this.flux * 3)) this.onset = 1
    this.prevKick = this.smooth[S.KICK]
    this.onset *= 0.86
    this.pulse *= 0.92
    this.lfoPhase += Math.max(0, Math.min(0.1, t - this.lastT)) * this.settings.lfoHz
    this.lastT = t
    const lfo = 0.5 + 0.5 * Math.sin(this.lfoPhase * Math.PI * 2)
    for (let i = 0; i < 6; i++) this.sources[i] = this.smooth[i]
    this.sources[S.ONSET] = this.onset
    this.sources[S.LFO] = lfo
    this.sources[S.PULSE] = this.pulse
    return this.sources
  }

  get binHz() { return this.analyser ? (this.ctx?.sampleRate ?? 48000) / this.analyser.fftSize : 23.4 }
}

export const labAudio = new AudioEngine()
export const useAudioMode = () => {
  const snap = useSyncExternalStore(labAudio.subscribe, labAudio.getSnapshot)
  const [mode, hear] = snap.split('|')
  return { mode: mode as AudioMode, hear: hear === '1', settings: labAudio.settings, fileName: labAudio.fileName }
}
