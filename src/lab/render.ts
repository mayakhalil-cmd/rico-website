import { FX_DEFS, defsFor, evalParam } from './model'
import type { Layer } from './model'

export const OUT_W = 960
export const OUT_H = 540

interface Particle { x: number; y: number; vx: number; vy: number; life: number; max: number; h: number }
interface Runtime { phase: number; acc: number; parts: Particle[] }
export type Strokes = Map<number, number[][]> 

export class Renderer {
  private scene = document.createElement('canvas')
  private runtime = new Map<number, Runtime>()
  private hasConic: boolean
  values = new Map<string, number>() 

  constructor() {
    this.scene.width = OUT_W
    this.scene.height = OUT_H
    const c = this.scene.getContext('2d')!
    this.hasConic = typeof c.createConicGradient === 'function'
    c.fillStyle = '#000'; c.fillRect(0, 0, OUT_W, OUT_H)
  }

  private rt(id: number) {
    let r = this.runtime.get(id)
    if (!r) { r = { phase: 0, acc: 0, parts: [] }; this.runtime.set(id, r) }
    return r
  }

  clear() {
    const c = this.scene.getContext('2d')!
    c.globalCompositeOperation = 'source-over'
    c.fillStyle = '#000'; c.fillRect(0, 0, OUT_W, OUT_H)
    this.runtime.clear()
  }

  render(out: HTMLCanvasElement, layers: Layer[], fx: Layer['p'], src: number[], wave: Uint8Array, strokes: Strokes, t: number, dt: number) {
    const s = this.scene.getContext('2d')!
    const o = out.getContext('2d')!
    const W = OUT_W, H = OUT_H, M = Math.min(W, H)
    const F: Record<string, number> = {}
    for (const d of FX_DEFS) {
      F[d.id] = evalParam(d, fx[d.id], src)
      this.values.set(`fx.${d.id}`, (F[d.id] - d.min) / (d.max - d.min))
    }
    const hueBase = (F.hue + t * F.hueSpeed * 0.25) % 1
    const ws = (u: number) => wave[Math.floor((((u % 1) + 1) % 1) * (wave.length - 1))] / 128 - 1

    s.globalCompositeOperation = 'source-over'
    s.globalAlpha = 1
    if (Math.abs(F.zoom) > 0.0005 || Math.abs(F.rotate) > 0.0005) {
      s.save()
      s.translate(W / 2, H / 2); s.rotate(F.rotate); s.scale(1 + F.zoom, 1 + F.zoom); s.translate(-W / 2, -H / 2)
      s.drawImage(this.scene, 0, 0)
      s.restore()
    }
    s.fillStyle = `rgba(0,0,0,${(1 - F.trails).toFixed(3)})`
    s.fillRect(0, 0, W, H)

    for (const L of layers) {
      if (!L.visible) continue
      const V: Record<string, number> = {}
      for (const d of defsFor(L.type)) {
        V[d.id] = evalParam(d, L.p[d.id], src)
        this.values.set(`${L.id}.${d.id}`, (V[d.id] - d.min) / (d.max - d.min))
      }
      const r = this.rt(L.id)
      if (V.spin !== undefined) r.phase += V.spin * dt
      const cx = V.x * W, cy = V.y * H
      s.globalAlpha = V.opacity
      s.globalCompositeOperation = L.blend === 'add' ? 'lighter' : L.blend === 'screen' ? 'screen' : L.blend === 'difference' ? 'difference' : 'source-over'

      const paint = (kind: 'conic' | 'linear'): string | CanvasGradient => {
        if (L.color.mode === 'solid') return L.color.hex
        const h0 = hueBase * 360
        if (kind === 'linear' || !this.hasConic) {
          const g = s.createLinearGradient(0, 0, W, 0)
          for (let i = 0; i <= 6; i++) g.addColorStop(i / 6, `hsl(${(h0 + i * 60) % 360},100%,62%)`)
          return g
        }
        const g = s.createConicGradient(r.phase * 0.5 + hueBase * Math.PI * 2, cx, cy)
        for (let i = 0; i <= 6; i++) g.addColorStop(i / 6, `hsl(${(h0 + i * 60) % 360},100%,62%)`)
        return g
      }
      s.lineCap = 'round'; s.lineJoin = 'round'

      switch (L.type) {
        case 'ring': {
          const R = V.radius * M
          const path = new Path2D()
          const N = 128
          for (let i = 0; i <= N; i++) {
            const a = (i / N) * Math.PI * 2 + r.phase
            const rr = R * (1 + V.warp * (0.14 * Math.sin(a * 3 + t * 2) + 0.22 * ws(i / N)))
            const x = cx + Math.cos(a) * rr, y = cy + Math.sin(a) * rr
            if (i === 0) path.moveTo(x, y); else path.lineTo(x, y)
          }
          s.strokeStyle = paint('conic')
          if (V.glow > 0.02) {
            const a0 = s.globalAlpha
            s.globalAlpha = a0 * 0.22 * V.glow; s.lineWidth = V.thickness * 3.2; s.stroke(path)
            s.globalAlpha = a0 * 0.45 * V.glow; s.lineWidth = V.thickness * 1.8; s.stroke(path)
            s.globalAlpha = a0
          }
          s.lineWidth = V.thickness; s.stroke(path)
          break
        }
        case 'polygon': {
          const path = new Path2D()
          for (let k = 0; k < V.copies; k++) {
            const rad = V.radius * M * (0.25 + 0.75 * ((k + 1) / V.copies))
            const rot = r.phase * (k % 2 ? -1 : 1) + V.twist * k
            for (let j = 0; j <= V.sides; j++) {
              const a = rot + (j / V.sides) * Math.PI * 2
              const x = cx + Math.cos(a) * rad, y = cy + Math.sin(a) * rad
              if (j === 0) path.moveTo(x, y); else path.lineTo(x, y)
            }
          }
          s.strokeStyle = paint('conic'); s.lineWidth = V.thickness; s.stroke(path)
          break
        }
        case 'rays': {
          const path = new Path2D()
          const n = V.count
          for (let i = 0; i < n; i++) {
            const a = (i / n) * Math.PI * 2 + r.phase
            const rnd = Math.abs(Math.sin(i * 12.9898) * 43758.5453) % 1
            const len = V.length * M * (0.45 + 0.55 * rnd) * (1 + 0.35 * ws(i / n))
            const bend = V.bend * Math.sin(t * 0.8 + i * 0.25)
            path.moveTo(cx, cy)
            path.quadraticCurveTo(cx + Math.cos(a + bend * 0.5) * len * 0.6, cy + Math.sin(a + bend * 0.5) * len * 0.6, cx + Math.cos(a) * len, cy + Math.sin(a) * len)
          }
          s.strokeStyle = paint('conic'); s.lineWidth = V.thickness; s.stroke(path)
          break
        }
        case 'waves': {
          const path = new Path2D()
          const lines = V.lines, amp = V.amplitude * H, span = V.spread * H
          for (let i = 0; i < lines; i++) {
            const y0 = cy - span / 2 + span * (lines > 1 ? i / (lines - 1) : 0.5)
            for (let x = 0; x <= W; x += 10) {
              const env = Math.sin((x / W) * Math.PI)
              const y = y0 + env * (Math.sin(x * 0.012 + t * V.speed + i * 0.4) * amp + ws(x / W + i * 0.03) * amp * V.audio * 1.5)
              if (x === 0) path.moveTo(x, y); else path.lineTo(x, y)
            }
          }
          s.strokeStyle = paint('linear'); s.lineWidth = V.thickness; s.stroke(path)
          break
        }
        case 'particles': {
          r.acc += V.rate * dt
          while (r.acc >= 1 && r.parts.length < 1200) {
            r.acc -= 1
            const a = Math.random() * Math.PI * 2, sp = V.speed * M * (0.4 + Math.random())
            r.parts.push({ x: cx, y: cy, vx: Math.cos(a) * sp, vy: Math.sin(a) * sp, life: 0, max: V.life * (0.6 + Math.random() * 0.8), h: a / (Math.PI * 2) })
          }
          if (r.acc > 1) r.acc = 0
          const g = V.gravity * M * 0.8
          const solid = L.color.mode === 'solid'
          const sz = V.size
          const buckets: number[][] = solid ? [[]] : Array.from({ length: 12 }, () => [])
          const keep: Particle[] = []
          for (const p of r.parts) {
            p.life += dt
            if (p.life >= p.max) continue
            p.vy += g * dt; p.x += p.vx * dt; p.y += p.vy * dt
            keep.push(p)
            const b = solid ? 0 : Math.floor(((p.h + hueBase) % 1) * 12)
            buckets[b].push(p.x, p.y, 1 - p.life / p.max)
          }
          r.parts = keep
          const a0 = s.globalAlpha
          buckets.forEach((arr, b) => {
            if (!arr.length) return
            s.fillStyle = solid ? L.color.hex : `hsl(${b * 30},100%,62%)`
            for (let k = 0; k < arr.length; k += 3) {
              s.globalAlpha = a0 * arr[k + 2]
              s.fillRect(arr[k] - sz / 2, arr[k + 1] - sz / 2, sz, sz)
            }
          })
          s.globalAlpha = a0
          break
        }
        case 'dots': {
          const path = new Path2D()
          const sp = V.spacing
          for (let y = sp / 2; y < H; y += sp) {
            for (let x = sp / 2; x < W; x += sp) {
              const dx = x - cx, dy = y - cy
              const d = Math.sqrt(dx * dx + dy * dy)
              const k = 0.5 + 0.5 * Math.sin(d * 0.03 - t * V.speed)
              const size = sp * V.size * (1 - V.wave + V.wave * k)
              if (size < 0.6) continue
              path.rect(x - size / 2, y - size / 2, size, size)
            }
          }
          s.fillStyle = paint('conic'); s.fill(path)
          break
        }
        case 'draw': {
          const list = strokes.get(L.id)
          if (!list || !list.length) break
          const E = V.echoes
          s.strokeStyle = paint('conic')
          s.lineWidth = V.thickness
          const a0 = s.globalAlpha
          for (let k = 0; k < E; k++) {
            const sc = V.scale * (1 - k * (0.6 / Math.max(1, E)))
            s.save()
            s.translate(cx, cy); s.rotate(r.phase * (k + 1) * 0.35); s.scale(sc, sc); s.translate(-cx, -cy)
            s.globalAlpha = a0 * (1 - k / (E + 0.5))
            const path = new Path2D()
            for (const st of list) {
              for (let i = 0; i < st.length; i += 2) {
                const n = i / 2
                const wob = V.wobble * M * (Math.sin(n * 0.35 + t * 5 + k) + ws(n / 80 + k * 0.1) * 1.5)
                const x = st[i] * W + wob, y = st[i + 1] * H - wob
                if (i === 0) path.moveTo(x, y); else path.lineTo(x, y)
              }
            }
            s.stroke(path)
            s.restore()
          }
          s.globalAlpha = a0
          break
        }
        case 'text': {
          const size = V.size * M
          s.save()
          s.translate(cx + (Math.random() - 0.5) * V.jitter * M * 2, cy + (Math.random() - 0.5) * V.jitter * M * 2)
          s.rotate(r.phase)
          s.font = `${Math.round(size)}px Teletactile, VT323, 'Courier New', monospace`
          s.textAlign = 'center'; s.textBaseline = 'middle'
          const ctxLS = s as CanvasRenderingContext2D & { letterSpacing?: string }
          if ('letterSpacing' in ctxLS) ctxLS.letterSpacing = `${Math.round(V.tracking * size)}px`
          s.fillStyle = paint('linear')
          s.fillText(L.text || ' ', 0, 0)
          if ('letterSpacing' in ctxLS) ctxLS.letterSpacing = '0px'
          s.restore()
          break
        }
      }
    }
    s.globalAlpha = 1
    s.globalCompositeOperation = 'source-over'

    o.globalCompositeOperation = 'source-over'
    o.globalAlpha = 1
    const segs = F.kaleido >= 2 ? Math.round(F.kaleido / 2) * 2 : 0
    if (segs) {
      o.fillStyle = '#000'; o.fillRect(0, 0, W, H)
      const ang = (Math.PI * 2) / segs, R = Math.hypot(W, H)
      for (let k = 0; k < segs; k++) {
        o.save()
        o.translate(W / 2, H / 2)
        o.rotate(k * ang)
        if (k % 2) { o.rotate(ang); o.scale(1, -1) }
        o.beginPath(); o.moveTo(0, 0); o.arc(0, 0, R, -0.003, ang + 0.003); o.closePath(); o.clip()
        o.drawImage(this.scene, -W / 2, -H / 2)
        o.restore()
      }
    } else {
      o.drawImage(this.scene, 0, 0)
    }
    if (F.glitch > 0.25) {
      const slices = 2 + Math.floor(F.glitch * 6)
      for (let i = 0; i < slices; i++) {
        const sy = Math.random() * H, sh = 6 + Math.random() * 36
        o.drawImage(out, 0, sy, W, sh, (Math.random() - 0.5) * 120 * F.glitch, sy, W, sh)
      }
    }
  }
}
