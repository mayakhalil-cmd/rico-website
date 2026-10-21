import { useEffect, useRef } from 'react'
import { usePrefs } from '../prefs'
import { useFinePointer, useReducedMotion } from '../hooks'


const GREEN = '#3bff03', PINK = '#f820a0'
const NOTES = ['C', 'C#', 'D', 'D#', 'E', 'F', 'F#', 'G', 'G#', 'A', 'A#', 'B']
const INTERACTIVE = 'a, button, [role="button"], [role="tab"], input, select, label, .node'

export default function Cursor() {
  const fine = useFinePointer()
  const reduced = useReducedMotion()
  const style = usePrefs().cursor
  const ref = useRef<HTMLCanvasElement | null>(null)

  useEffect(() => {
    if (!fine || reduced) return
    const canvas = ref.current
    const ctx = canvas?.getContext('2d')
    if (!canvas || !ctx) return
    let W = 0, H = 0, raf = 0, started = false, hot = false
    let tx = -200, ty = -200, x = -200, y = -200, px = -200, py = -200
    let lastSpawn = 0

    const bits: { x: number; y: number; vy: number; life: number; ch: string; pink: boolean }[] = []
    const path: { x: number; y: number; t: number }[] = []
    const pix: { x: number; y: number; len: number; life: number; c: string }[] = []
    const msgs: { x: number; y: number; text: string; life: number }[] = []
    const leds = new Map<number, number>() // grid cell → brightness
    const notes: { x: number; y: number; w: number; life: number; label: string }[] = []

    const size = () => { W = canvas.width = window.innerWidth; H = canvas.height = window.innerHeight }
    size()
    window.addEventListener('resize', size)
    const onMove = (e: PointerEvent) => {
      tx = e.clientX; ty = e.clientY
      if (!started) { started = true; x = px = tx; y = py = ty }
      hot = !!(e.target as Element | null)?.closest(INTERACTIVE)
    }
    window.addEventListener('pointermove', onMove, { passive: true })

    const tick = (now: number) => {
      raf = requestAnimationFrame(tick)
      ctx.clearRect(0, 0, W, H)
      if (!started) return
      px = x; py = y
      x += (tx - x) * 0.35; y += (ty - y) * 0.35
      const speed = Math.hypot(x - px, y - py)
      const accent = hot ? PINK : GREEN
      ctx.font = "12px 'Courier Prime', monospace"

      if (style === 'trail') {
        if (speed > 1.2 && now - lastSpawn > 22) {
          lastSpawn = now
          bits.push({ x: tx + (Math.random() - 0.5) * 8, y: ty, vy: 0.6 + Math.random() * 1.2, life: 1, ch: Math.random() < 0.5 ? '0' : '1', pink: Math.random() < 0.14 })
        }
        for (let i = bits.length - 1; i >= 0; i--) {
          const b = bits[i]; b.y += b.vy; b.life -= 0.022
          if (b.life <= 0) { bits.splice(i, 1); continue }
          ctx.globalAlpha = b.life
          ctx.fillStyle = b.pink ? PINK : GREEN
          ctx.fillText(b.ch, b.x, b.y)
        }
        ctx.globalAlpha = 1
        ctx.fillStyle = accent
        ctx.fillRect(tx - 1, ty - 7, 2, 14)
      }

      if (style === 'pixel') {
        const G = 8
        if (speed > 0.8 && now - lastSpawn > 16) {
          lastSpawn = now
          for (let k = 0; k < 3; k++) {
            const gx = Math.floor((tx + (Math.random() - 0.5) * 24) / G) * G
            const gy = Math.floor((ty + (Math.random() - 0.5) * 24) / G) * G
            pix.push({ x: gx, y: gy, len: G, life: 1, c: Math.random() < 0.15 ? PINK : Math.random() < 0.3 ? '#ffffff' : GREEN })
          }
        }
        if (pix.length > 500) pix.splice(0, pix.length - 500)
        for (let i = pix.length - 1; i >= 0; i--) {
          const q = pix[i]; q.len += 1.2 + (1 - q.life) * 3; q.life -= 0.018
          if (q.life <= 0) { pix.splice(i, 1); continue }
          ctx.globalAlpha = q.life
          ctx.fillStyle = q.c
          ctx.fillRect(q.x, q.y, G - 1, q.len) // the pixel "sorts" downward into a streak
        }
        ctx.globalAlpha = 1
        ctx.strokeStyle = accent; ctx.lineWidth = 1.5
        ctx.strokeRect(Math.floor(tx / G) * G - 0.5, Math.floor(ty / G) * G - 0.5, G, G)
      }

      if (style === 'osc') {
        if (speed > 1 && now - lastSpawn > 90) {
          lastSpawn = now
          const text = hot
            ? '/ui/hover 1'
            : `/mouse/xy ${(tx / W).toFixed(2)} ${(ty / H).toFixed(2)}`
          msgs.push({ x: tx + 14, y: ty + 6, text, life: 1 })
        }
        if (msgs.length > 40) msgs.splice(0, msgs.length - 40)
        for (let i = msgs.length - 1; i >= 0; i--) {
          const m = msgs[i]; m.y -= 0.7; m.life -= 0.012
          if (m.life <= 0) { msgs.splice(i, 1); continue }
          ctx.globalAlpha = m.life
          ctx.fillStyle = i === msgs.length - 1 ? '#ffffff' : m.text.startsWith('/ui') ? PINK : GREEN
          ctx.fillText(m.text, m.x, m.y)
        }
        ctx.globalAlpha = 1
        ctx.strokeStyle = accent; ctx.lineWidth = 1.5
        ctx.beginPath(); ctx.moveTo(x - 7, y - 7); ctx.lineTo(x - 10, y - 7); ctx.lineTo(x - 10, y + 7); ctx.lineTo(x - 7, y + 7)
        ctx.moveTo(x + 7, y - 7); ctx.lineTo(x + 10, y - 7); ctx.lineTo(x + 10, y + 7); ctx.lineTo(x + 7, y + 7); ctx.stroke()
      }

      if (style === 'led') {
        const G = 10, R = 34 + Math.min(30, speed * 2)
        const cols = Math.ceil(W / G) + 1
        const c0 = Math.floor((x - R) / G), c1 = Math.ceil((x + R) / G)
        const r0 = Math.floor((y - R) / G), r1 = Math.ceil((y + R) / G)
        for (let r = r0; r <= r1; r++) for (let c = c0; c <= c1; c++) {
          const d = Math.hypot(c * G - x, r * G - y)
          if (d > R) continue
          const key = r * cols + c, v = 1 - d / R
          if ((leds.get(key) ?? 0) < v) leds.set(key, v)
        }
        for (const [key, v] of leds) {
          const nv = v - 0.03
          if (nv <= 0) { leds.delete(key); continue }
          leds.set(key, nv)
          const r = Math.floor(key / cols), c = key - r * cols
          ctx.globalAlpha = nv
          ctx.fillStyle = hot ? PINK : nv > 0.7 ? '#ffffff' : GREEN
          ctx.beginPath(); ctx.arc(c * G, r * G, 1.2 + nv * 2.6, 0, Math.PI * 2); ctx.fill()
        }
        ctx.globalAlpha = 1
      }

      if (style === 'gcode') {
        if (speed > 0.6) path.push({ x, y, t: now })
        while (path.length && now - path[0].t > 1400) path.shift()
        ctx.lineCap = 'round'; ctx.lineJoin = 'round'
        for (let i = 1; i < path.length; i++) {
          const a = path[i - 1], b = path[i], age = (now - b.t) / 1400
          ctx.strokeStyle = age < 0.15 ? '#ffffff' : GREEN
          ctx.globalAlpha = 1 - age
          ctx.lineWidth = 3
          ctx.beginPath(); ctx.moveTo(a.x, a.y); ctx.lineTo(b.x, b.y); ctx.stroke()
        }
        ctx.globalAlpha = 1
        ctx.fillStyle = accent
        ctx.beginPath(); ctx.moveTo(x, y); ctx.lineTo(x - 7, y - 14); ctx.lineTo(x + 7, y - 14); ctx.closePath(); ctx.fill()
        ctx.fillRect(x - 4, y - 22, 8, 8)
        const f = Math.round(Math.min(9000, speed * 300))
        ctx.fillText(`G1 X${(x / 4).toFixed(1)} Y${((H - y) / 4).toFixed(1)} F${f}`, x + 14, y + 4)
      }

      if (style === 'piano') {
        const ROW = 9
        if (speed > 1.5 && now - lastSpawn > 70) {
          lastSpawn = now
          const row = Math.round(ty / ROW)
          const midi = 96 - (row % 48)
          notes.push({ x: tx, y: row * ROW, w: 10 + Math.min(70, speed * 4), life: 1, label: `${NOTES[midi % 12]}${Math.floor(midi / 12) - 1}` })
        }
        for (let i = notes.length - 1; i >= 0; i--) {
          const n = notes[i]; n.x -= 1.6; n.life -= 0.012
          if (n.life <= 0) { notes.splice(i, 1); continue }
          ctx.globalAlpha = n.life
          ctx.fillStyle = i === notes.length - 1 ? PINK : GREEN
          ctx.fillRect(n.x, n.y - ROW / 2 + 1, n.w, ROW - 2)
          if (n.life > 0.85) { ctx.fillStyle = '#ffffff'; ctx.fillText(n.label, n.x + n.w + 4, n.y + 4) }
        }
        ctx.globalAlpha = 1
        ctx.strokeStyle = accent; ctx.lineWidth = 1
        ctx.beginPath(); ctx.moveTo(tx, ty - 14); ctx.lineTo(tx, ty + 14); ctx.stroke()
      }

      if (style === 'wave') {
        path.push({ x, y, t: speed })
        if (path.length > 60) path.shift()
        ctx.strokeStyle = GREEN; ctx.lineWidth = 1.6
        ctx.beginPath()
        for (let i = 0; i < path.length; i++) {
          const p = path[i]
          const prev = path[Math.max(0, i - 1)]
          const nx = -(p.y - prev.y), ny = p.x - prev.x
          const l = Math.hypot(nx, ny) || 1
          const amp = Math.min(18, p.t * 1.6) * Math.sin(i * 0.9 - now * 0.02)
          const sx = p.x + (nx / l) * amp, sy = p.y + (ny / l) * amp
          if (i === 0) ctx.moveTo(sx, sy); else ctx.lineTo(sx, sy)
        }
        ctx.globalAlpha = 0.9; ctx.stroke(); ctx.globalAlpha = 1
        ctx.fillStyle = accent
        ctx.beginPath(); ctx.arc(x, y, 3.5, 0, Math.PI * 2); ctx.fill()
        ctx.fillText(`${(Math.min(1, speed / 25)).toFixed(2)}`, x + 10, y - 8)
      }
    }
    raf = requestAnimationFrame(tick)
    return () => {
      cancelAnimationFrame(raf)
      window.removeEventListener('pointermove', onMove)
      window.removeEventListener('resize', size)
    }
  }, [fine, reduced, style])

  if (!fine || reduced) return null
  return <canvas ref={ref} className="cursor-canvas" aria-hidden="true" />
}
