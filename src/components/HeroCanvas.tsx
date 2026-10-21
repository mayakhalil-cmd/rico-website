import { useEffect, useRef } from 'react'
import { useReducedMotion } from '../hooks'
import { labAudio } from '../lab/audio'
import { BANDS } from '../lab/model'

export type CanvasMode = 'bands'
const FPS = 30
const LANES = BANDS.length

export default function HeroCanvas({ mode }: { mode: CanvasMode }) {
  const ref = useRef<HTMLCanvasElement | null>(null)
  const reduced = useReducedMotion()

  useEffect(() => {
    const canvas = ref.current
    if (!canvas) return
    const ctx = canvas.getContext('2d', { alpha: false })
    if (!ctx) return
    let w = 0, h = 0, raf = 0, last = 0, visible = true, lastOnset = 0
    const t0 = performance.now()
    const ptr = { x: -999, y: -999, active: false, sx: -999, sy: -999 }
    const ripples: { x: number; t: number }[] = []
    const energy = new Float32Array(LANES)
    let lane = new Uint8Array(0), px = new Float32Array(0), ph = new Float32Array(0), py = new Float32Array(0)

    const laneY = (i: number) => h * (0.78 - (i / (LANES - 1)) * 0.6)
    const laneH = () => (h * 0.6) / (LANES - 1)

    const resize = () => {
      const r = canvas.getBoundingClientRect()
      const dpr = Math.min(window.devicePixelRatio || 1, 1.5)
      w = r.width; h = r.height
      canvas.width = Math.round(w * dpr); canvas.height = Math.round(h * dpr)
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0)
      const count = Math.round(Math.min(900, (w * h) / 1400))
      lane = new Uint8Array(count); px = new Float32Array(count); ph = new Float32Array(count); py = new Float32Array(count)
      for (let i = 0; i < count; i++) { lane[i] = i % LANES; px[i] = Math.random() * w; ph[i] = Math.random() * 2 - 1; py[i] = NaN }
      ctx.fillStyle = '#000'; ctx.fillRect(0, 0, w, h)
    }

    const yAt = (i: number, x: number, off: number, t: number) => {
      const e = energy[i]
      const amp = laneH() * (0.1 + e * 0.32)
      const k = 0.003 * (1 + i * 0.85) // higher band = tighter ripples
      let y = laneY(i) + Math.sin(x * k - t * (0.8 + i * 0.55) + i) * amp + off * laneH() * (0.08 + e * 0.12)
      for (const r of ripples) {
        const age = t - r.t, d = x - (r.x + age * 520)
        y += Math.exp(-(d * d) / 14000) * Math.sin(d * 0.018) * laneH() * 0.4 * (1 - age / 1.6)
      }
      if (ptr.active) {
        const dx = x - ptr.sx, dy = y - ptr.sy, d = Math.hypot(dx, dy)
        if (d < 150) y += Math.sign(dy || 1) * (150 - d) * 0.55
      }
      return y
    }

    const draw = (now: number) => {
      const t = (now - t0) / 1000
      const snd = labAudio.sample()
      const on = labAudio.mode !== 'off'
      for (let i = 0; i < LANES; i++) {
        const idle = 0.18 + 0.14 * Math.sin(t * (0.4 + i * 0.13) + i * 1.7)
        energy[i] += ((on ? snd[i] : idle) - energy[i]) * 0.12 // smoothed so the streams flow instead of jitter
      }
      if (on && snd[6] > 0.7 && t - lastOnset > 0.3) { lastOnset = t; ripples.push({ x: w * 0.3, t }) }
      while (ripples.length && t - ripples[0].t > 1.6) ripples.shift()
      ptr.sx += (ptr.x - ptr.sx) * 0.2
      ptr.sy += (ptr.y - ptr.sy) * 0.2

      ctx.fillStyle = 'rgba(0, 0, 0, 0.14)'
      ctx.fillRect(0, 0, w, h)

      let loud = 0
      for (let i = 1; i < LANES; i++) if (energy[i] > energy[loud]) loud = i
      const paths = Array.from({ length: LANES }, () => new Path2D())
      for (let p = 0; p < lane.length; p++) {
        const i = lane[p]
        const nx = px[p] + (1.2 + energy[i] * 5) * (1 + i * 0.18)
        if (nx > w + 4) { px[p] = -4 - Math.random() * 40; py[p] = NaN; continue }
        const ny = yAt(i, nx, ph[p], t)
        if (!Number.isNaN(py[p])) { paths[i].moveTo(px[p], py[p]); paths[i].lineTo(nx, ny) }
        px[p] = nx; py[p] = ny
      }
      for (let i = 0; i < LANES; i++) {
        const e = energy[i]
        ctx.lineWidth = 1 + e * 1.6 + (LANES - i) * 0.12 // low bands are heavier
        ctx.strokeStyle = on && i === loud && e > 0.35
          ? `rgba(248, 32, 160, ${0.5 + e * 0.5})`
          : e > 0.75 ? `rgba(255, 255, 255, ${0.6 + e * 0.4})` : `rgba(59, 255, 3, ${0.35 + e * 0.6})`
        ctx.stroke(paths[i])
      }
      ctx.font = "11px 'Courier Prime', monospace"
      ctx.textAlign = 'right'
      for (let i = 0; i < LANES; i++) {
        const y = laneY(i), e = energy[i], hot = on && i === loud
        ctx.fillStyle = 'rgba(0, 0, 0, 0.9)'
        ctx.fillRect(w - 150, y - 9, 140, 18)
        ctx.fillStyle = hot ? '#f820a0' : 'rgba(255, 255, 255, 0.75)'
        ctx.fillText(`${BANDS[i].label} ${e.toFixed(2)}`, w - 46, y + 4)
        ctx.fillStyle = 'rgba(59, 255, 3, 0.25)'; ctx.fillRect(w - 40, y - 3, 30, 6)
        ctx.fillStyle = hot ? '#f820a0' : '#3bff03'; ctx.fillRect(w - 40, y - 3, 30 * Math.min(1, e), 6)
      }
      ctx.textAlign = 'left'
      const g = ctx.createLinearGradient(0, 0, w * 0.55, 0)
      g.addColorStop(0, 'rgba(0, 0, 0, 0.16)'); g.addColorStop(1, 'rgba(0, 0, 0, 0)')
      ctx.fillStyle = g; ctx.fillRect(0, 0, w * 0.55, h)
    }

    const loop = (now: number) => {
      raf = requestAnimationFrame(loop)
      if (!visible || document.hidden || now - last < 1000 / FPS) return
      last = now
      draw(now)
    }

    const local = (e: PointerEvent) => {
      const r = canvas.getBoundingClientRect()
      return { x: e.clientX - r.left, y: e.clientY - r.top, inside: e.clientY >= r.top && e.clientY <= r.bottom }
    }
    const onMove = (e: PointerEvent) => { const p = local(e); ptr.active = p.inside; if (p.inside) { ptr.x = p.x; ptr.y = p.y } }
    const onDown = (e: PointerEvent) => {
      const p = local(e)
      if (!p.inside || (e.target as Element | null)?.closest('a, button, input, select')) return
      ripples.push({ x: p.x - 60, t: (performance.now() - t0) / 1000 })
    }
    const onLeave = () => { ptr.active = false }

    resize()
    const ro = new ResizeObserver(resize)
    ro.observe(canvas)
    if (reduced) {
      for (let i = 0; i < 40; i++) draw(t0 + 2000 + i * 33)
      return () => ro.disconnect()
    }
    const io = new IntersectionObserver(([e]) => { visible = e.isIntersecting })
    io.observe(canvas)
    window.addEventListener('pointermove', onMove, { passive: true })
    window.addEventListener('pointerdown', onDown, { passive: true })
    document.addEventListener('pointerleave', onLeave)
    raf = requestAnimationFrame(loop)
    return () => {
      cancelAnimationFrame(raf); ro.disconnect(); io.disconnect()
      window.removeEventListener('pointermove', onMove)
      window.removeEventListener('pointerdown', onDown)
      document.removeEventListener('pointerleave', onLeave)
    }
  }, [mode, reduced])

  return <canvas ref={ref} className="ascii-field" aria-hidden="true" />
}
