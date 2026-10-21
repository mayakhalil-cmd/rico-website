import type { KeyboardEvent } from 'react'
import { diagramNodes } from '../data/site'
import LiveWire from './LiveWire'
import { depthMove } from '../depth'

const SIZE = 640
const C = SIZE / 2
const RADIUS = 228

interface Props {
  selected: number[] 
  live: boolean 
  sending: number[] 
  receiving: number[] 
  onSelect: (i: number) => void
}

export default function RoutingDiagram({ selected, live, sending, receiving, onSelect }: Props) {
  const nodes = diagramNodes.map((label, i) => {
    const a = (-90 + (360 / diagramNodes.length) * i) * (Math.PI / 180)
    return { label, x: C + Math.cos(a) * RADIUS, y: C + Math.sin(a) * RADIUS, i }
  })

  const onKey = (e: KeyboardEvent<SVGGElement>, i: number) => {
    if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); onSelect(i) }
  }

  return (
    <svg className={live ? 'routing is-live' : 'routing'} viewBox={`-40 0 ${SIZE + 80} ${SIZE}`} role="group" aria-label="RICO routing illustration. Choose two or more protocols to route between them.">
      {/* a faint spider web behind everything: spokes plus sagging rings */}
      <path d={webPath(nodes.length * 2, [0.42, 0.63, 0.84, 1.04])} className="web" aria-hidden="true" />

      {nodes.map((n) => {
        const dx = n.x - C, dy = n.y - C
        const len = Math.hypot(dx, dy)
        const ux = dx / len, uy = dy / len
        const x1 = C + ux * 112, y1 = C + uy * 84
        const x2 = n.x - ux * 34, y2 = n.y - uy * 34
        const picked = selected.includes(n.i)
        const isLive = live && picked
        const tx = sending.includes(n.i), rx = receiving.includes(n.i)
        const dir = tx && !rx ? 'out' : rx && !tx ? 'in' : 'both'
        return (
          <g key={n.label} className={isLive ? 'link live' : picked ? 'link armed' : 'link'}>
            {/* dotted until the route is live, then the wire boings into place */}
            {isLive
              ? <LiveWire x1={x2} y1={y2} x2={x1} y2={y1} dir={dir} phase={n.i * 1.3} />
              : <line x1={x1} y1={y1} x2={x2} y2={y2} className="link-base" />}
          </g>
        )
      })}

      {nodes.map((n) => {
        const on = selected.includes(n.i)
        const below = n.y > C - 10
        return (
          <g
            key={n.label + '-node'}
            className={`node${on ? ' on' : ''}`}
            role="button"
            tabIndex={0}
            aria-pressed={on}
            aria-label={n.label}
            onClick={() => onSelect(n.i)}
            onKeyDown={(e) => onKey(e, n.i)}
          >
            <rect x={n.x - 40} y={n.y - 40} width="80" height="80" className="node-hit" />
            <rect x={n.x - 30} y={n.y - 30} width="60" height="60" className="node-box" />
            <path d={corners(n.x, n.y, 36, 9)} className="node-corner" />
            {on && (
              <g className="node-meter">
                {[0, 1, 2, 3].map((b) => (
                  <rect key={b} x={n.x - 11 + b * 6} y={n.y + 12} width="4" height="10" style={{ animationDelay: `${((n.i * 3 + b) * 0.13) % 0.8}s` }} />
                ))}
              </g>
            )}
            <text x={n.x} y={n.y + (on ? 2 : 6)} textAnchor="middle" className="node-index">
              {String(n.i + 1).padStart(2, '0')}
            </text>
            <text x={n.x} y={n.y + (below ? 58 : -48)} textAnchor="middle" className="node-label">
              {n.label}
            </text>
          </g>
        )
      })}

      {/* RICO set like the logo: a white fill over an offset white outline */}
      <g className={live ? 'hub-word live' : 'hub-word'}
        onPointerMove={(e) => depthMove(e, (dx, dy) => {
          const o = e.currentTarget.querySelector('.hub-outline') as SVGTextElement | null
          if (o) o.style.transform = `translate(${dx * 7}px, ${dy * 7}px)`
        })}
        onPointerLeave={(e) => { const o = e.currentTarget.querySelector('.hub-outline') as SVGTextElement | null; if (o) o.style.transform = '' }}>
        <rect x={C - 110} y={C - 44} width="220" height="64" fill="transparent" />
        <text x={C + 3} y={C + 7} textAnchor="middle" className="hub-outline">RICO</text>
        <text x={C} y={C + 4} textAnchor="middle" className="hub-fill">RICO</text>
      </g>
      <text x={C} y={C + 34} textAnchor="middle" className="hub-sub">route · translate</text>
      {live && (
        <g className="hub-meter">
          {Array.from({ length: 12 }, (_, b) => (
            <rect key={b} x={C - 47 + b * 8} y={C + 46} width="5" height="14" style={{ animationDelay: `${(b * 0.17) % 0.7}s` }} />
          ))}
        </g>
      )}

    </svg>
  )
}

function corners(x: number, y: number, h: number, l: number, hw = h, hh = h) {
  return [[-1, -1], [1, -1], [1, 1], [-1, 1]].map(([sx, sy]) => {
    const cx = x + sx * hw, cy = y + sy * hh
    return `M${cx - sx * l} ${cy} L${cx} ${cy} L${cx} ${cy - sy * l}`
  }).join(' ')
}

function webPath(spokes: number, rings: number[]) {
  const pt = (k: number, r: number) => {
    const a = (-90 + (360 / spokes) * k) * (Math.PI / 180)
    return [C + Math.cos(a) * r, C + Math.sin(a) * r]
  }
  let d = ''
  for (let k = 0; k < spokes; k++) { const [sx, sy] = pt(k, RADIUS * 0.42), [x, y] = pt(k, RADIUS * 1.12); d += `M${sx} ${sy} L${x} ${y} ` } // spokes stop short of RICO
  for (const f of rings) {
    const r = RADIUS * f
    for (let k = 0; k < spokes; k++) {
      const [ax, ay] = pt(k, r), [bx, by] = pt(k + 1, r), [mx, my] = pt(k + 0.5, r * 0.9)
      d += `M${ax} ${ay} Q${mx} ${my} ${bx} ${by} `
    }
  }
  return d
}
