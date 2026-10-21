import { useEffect, useRef } from 'react'
import { useReducedMotion } from '../hooks'

interface Props {
  x1: number; y1: number; x2: number; y2: number
  c1?: [number, number]; c2?: [number, number]
  dir?: 'out' | 'in' | 'both' 
  phase?: number 
  className?: string
  packet?: number 
  sx?: number; sy?: number 
}

const lerp = (a: number, b: number, t: number) => a + (b - a) * t
function cubic(p0: number, p1: number, p2: number, p3: number, t: number) {
  const u = 1 - t
  return u * u * u * p0 + 3 * u * u * t * p1 + 3 * u * t * t * p2 + t * t * t * p3
}

export default function LiveWire({ x1, y1, x2, y2, c1, c2, dir = 'out', phase = 0, className = '', packet = 7, sx = 1, sy = 1 }: Props) {
  const path = useRef<SVGPathElement | null>(null)
  const pop = useRef<SVGCircleElement | null>(null)
  const dots = useRef<(SVGRectElement | null)[]>([])
  const reduced = useReducedMotion()

  useEffect(() => {
    const len = Math.hypot(x2 - x1, y2 - y1) || 1
    const nx = -(y2 - y1) / len, ny = (x2 - x1) / len 
    const b1 = c1 ?? [lerp(x1, x2, 1 / 3), lerp(y1, y2, 1 / 3)]
    const b2 = c2 ?? [lerp(x1, x2, 2 / 3), lerp(y1, y2, 2 / 3)]
    const kinds = dir === 'both' ? ['out', 'in', 'out', 'in'] : [dir, dir, dir]
    let raf = 0
    const t0 = performance.now()

    const render = (now: number) => {
      const t = reduced ? 5 : (now - t0) / 1000
      const grow = Math.min(1, t / 0.35)
      const reach = grow < 1 ? 1 - Math.pow(1 - grow, 3) : 1
      const boing = 0.42 * Math.exp(-t * 3.2) * Math.sin(t * 15 + 0.6)
      const sway = reduced ? 0 : 0.05 * Math.sin(now / 1000 * 2.4 + phase)
      const a = (boing + sway) * len, bb = (-boing * 0.6 + sway * 0.8) * len 
      const p1: [number, number] = [b1[0] + nx * a, b1[1] + ny * a]
      const p2: [number, number] = [b2[0] + nx * bb, b2[1] + ny * bb]
      const ex = lerp(x1, x2, reach), ey = lerp(y1, y2, reach)
      path.current?.setAttribute('d', `M${x1} ${y1} C${lerp(x1, p1[0], reach)} ${lerp(y1, p1[1], reach)}, ${lerp(x1, p2[0], reach)} ${lerp(y1, p2[1], reach)}, ${ex} ${ey}`)
      const pt = Math.max(0, t - 0.32)
      if (pop.current) {
        const show = pt > 0 && pt < 0.5
        pop.current.setAttribute('r', String(show ? 4 + pt * 40 : 0))
        pop.current.setAttribute('opacity', String(show ? 1 - pt / 0.5 : 0))
      }
      dots.current.forEach((el, k) => {
        if (!el) return
        if (t < 0.45) { el.setAttribute('opacity', '0'); return }
        let u = ((now / 1000) * 0.75 + k / kinds.length) % 1
        if (kinds[k] === 'in') u = 1 - u
        const x = cubic(x1, p1[0], p2[0], x2, u), y = cubic(y1, p1[1], p2[1], y2, u)
        el.setAttribute('opacity', '1')
        el.setAttribute('transform', `translate(${x} ${y}) scale(${1 / sx} ${1 / sy})`)
      })
      if (!reduced) raf = requestAnimationFrame(render)
    }
    raf = requestAnimationFrame(render)
    return () => cancelAnimationFrame(raf)
  }, [x1, y1, x2, y2, c1?.[0], c1?.[1], c2?.[0], c2?.[1], dir, phase, reduced, sx, sy])

  const n = dir === 'both' ? 4 : 3
  return (
    <g className={`live-wire ${className}`}>
      <path ref={path} className="lw-path" />
      <circle ref={pop} cx={x2} cy={y2} r="0" className="lw-pop" />
      {Array.from({ length: n }, (_, k) => (
        <rect key={k} ref={(el) => { dots.current[k] = el }} x={-packet / 2} y={-packet / 2} width={packet} height={packet} opacity="0"
          className={dir === 'in' || (dir === 'both' && k % 2) ? 'lw-dot in' : 'lw-dot'} />
      ))}
    </g>
  )
}
