import { useEffect, useRef } from 'react'
import { useReducedMotion } from '../hooks'
import { labAudio } from '../lab/audio'


const RAMP = ' .,:;-=+*#%@'
const LEVELS = 6
const FPS = 30

interface Pulse { x: number; y: number; t: number }

export default function AsciiField() {
  const canvasRef = useRef<HTMLCanvasElement | null>(null)
  const reduced = useReducedMotion()

  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas) return
    const ctx = canvas.getContext('2d', { alpha: false })
    if (!ctx) return

    let cw = 13, ch = 19, cols = 0, rows = 0, w = 0, h = 0, dpr = 1
    const pointer = { x: -9999, y: -9999, active: false }
    const pulses: Pulse[] = []
    let raf = 0, last = 0, visible = true
    let lastKick = 0
    const t0 = performance.now()
    const atlas = document.createElement('canvas')

    const buildAtlas = () => {
      atlas.width = Math.ceil(cw * RAMP.length * dpr)
      atlas.height = Math.ceil(ch * LEVELS * 2 * dpr)
      const a = atlas.getContext('2d')!
      a.setTransform(dpr, 0, 0, dpr, 0, 0)
      a.clearRect(0, 0, atlas.width, atlas.height)
      a.font = `700 ${ch - 5}px 'Courier Prime', 'Courier New', monospace`
      a.textBaseline = 'top'
      for (let c = 0; c < 2; c++) {
        for (let l = 0; l < LEVELS; l++) {
          const alpha = (0.25 + 0.75 * ((l + 1) / LEVELS)).toFixed(2)
          a.fillStyle = c === 0 ? `rgba(59, 255, 3, ${alpha})` : `rgba(248, 32, 160, ${alpha})`
          for (let g = 1; g < RAMP.length; g++) a.fillText(RAMP[g], g * cw, (c * LEVELS + l) * ch)
        }
      }
    }

    const resize = () => {
      const rect = canvas.getBoundingClientRect()
      dpr = Math.min(window.devicePixelRatio || 1, 1.5)
      w = rect.width; h = rect.height
      const small = w < 700
      cw = small ? 11 : 13
      ch = small ? 17 : 19
      canvas.width = Math.round(w * dpr)
      canvas.height = Math.round(h * dpr)
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0)
      cols = Math.ceil(w / cw)
      rows = Math.ceil(h / ch)
      buildAtlas()
    }

    const draw = (now: number) => {
      const t = (now - t0) / 1000
      const snd = labAudio.sample()
      // a strong kick from the shared audio sends a pulse from the right side
      if (snd[6] > 0.6 && t - lastKick > 0.25 && pulses.length < 6) {
        lastKick = t
        pulses.push({ x: w * 0.75, y: h * 0.5, t })
      }
      ctx.fillStyle = '#000'
      ctx.fillRect(0, 0, w, h)

      const s1x = w * (0.62 + 0.08 * Math.sin(t * 0.21)), s1y = h * (0.42 + 0.12 * Math.cos(t * 0.17))
      const s2x = w * (0.84 + 0.06 * Math.cos(t * 0.15)), s2y = h * (0.62 + 0.1 * Math.sin(t * 0.23))
      const k = 0.055
      const boost = 1 + snd[1] * 1.3 + snd[0] * 0.5
      while (pulses.length && t - pulses[0].t > 1.6) pulses.shift()
      const sw = cw * dpr, sh = ch * dpr

      for (let r = 0; r < rows; r++) {
        const y = r * ch + ch / 2
        for (let c = 0; c < cols; c++) {
          const x = c * cw + cw / 2
          let dx = x - s1x, dy = y - s1y
          let v = Math.sin(Math.sqrt(dx * dx + dy * dy) * k - t * 2.2)
          dx = x - s2x; dy = y - s2y
          v += Math.sin(Math.sqrt(dx * dx + dy * dy) * k - t * 1.7)
          v *= boost
          if (pointer.active) {
            dx = x - pointer.x; dy = y - pointer.y
            const dp = Math.sqrt(dx * dx + dy * dy)
            if (dp < 600) v += 1.6 * Math.sin(dp * 0.09 - t * 6) * Math.exp(-dp / 220)
          }
          let pv = 0
          for (let i = 0; i < pulses.length; i++) {
            const p = pulses[i], age = t - p.t
            dx = x - p.x; dy = y - p.y
            const d = Math.sqrt(dx * dx + dy * dy) - age * 420
            if (d > -60 && d < 60) pv += Math.exp(-(d * d) / 900) * 2.4 * (1 - age / 1.6)
          }
          v += pv
          const fade = Math.min(1, Math.max(0.32, (x / w - 0.18) * 1.6))
          const n = ((v + 2.5) / 5) * Math.max(fade, Math.min(1, pv))
          if (n < 0.18) continue
          const g = Math.min(RAMP.length - 1, Math.max(1, Math.floor(n * RAMP.length)))
          const level = Math.min(LEVELS - 1, Math.floor(n * LEVELS))
          const row = (pv > 0.7 ? LEVELS : 0) + level
          ctx.drawImage(atlas, g * sw, row * sh, sw, sh, c * cw, r * ch, cw, ch)
        }
      }
    }

    const loop = (now: number) => {
      raf = requestAnimationFrame(loop)
      if (!visible || now - last < 1000 / FPS) return
      last = now
      draw(now)
    }

    const toLocal = (e: PointerEvent) => {
      const rect = canvas.getBoundingClientRect()
      return { x: e.clientX - rect.left, y: e.clientY - rect.top, inside: e.clientY >= rect.top && e.clientY <= rect.bottom }
    }
    const onMove = (e: PointerEvent) => { const p = toLocal(e); pointer.x = p.x; pointer.y = p.y; pointer.active = p.inside }
    const onDown = (e: PointerEvent) => {
      const p = toLocal(e)
      if (p.inside && pulses.length < 6) pulses.push({ x: p.x, y: p.y, t: (performance.now() - t0) / 1000 })
    }
    const onLeave = () => { pointer.active = false }

    resize()
    const ro = new ResizeObserver(() => { resize(); if (reduced) draw(t0 + 4000) })
    ro.observe(canvas)
    document.fonts?.ready.then(() => { buildAtlas(); if (reduced) draw(t0 + 4000) })

    if (reduced) {
      draw(t0 + 4000)
      return () => ro.disconnect()
    }

    const io = new IntersectionObserver(([e]) => { visible = e.isIntersecting })
    io.observe(canvas)
    window.addEventListener('pointermove', onMove, { passive: true })
    window.addEventListener('pointerdown', onDown, { passive: true })
    document.addEventListener('pointerleave', onLeave)
    raf = requestAnimationFrame(loop)

    return () => {
      cancelAnimationFrame(raf)
      ro.disconnect()
      io.disconnect()
      window.removeEventListener('pointermove', onMove)
      window.removeEventListener('pointerdown', onDown)
      document.removeEventListener('pointerleave', onLeave)
    }
  }, [reduced])

  return <canvas ref={canvasRef} className="ascii-field" aria-hidden="true" />
}
