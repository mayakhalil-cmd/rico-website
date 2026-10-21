import { useEffect, useRef, useState } from 'react'
import { phantom } from '../data/site'
import LiveWire from './LiveWire'
import { depthMove } from '../depth'


const PROTOS = ['OSC', 'SERIAL', 'SSH']
const ENDS = [52, 170, 288]
const wirePath = (y: number) => `M0 170 C 70 170, 70 ${y}, 150 ${y}`

function ProjectorIcon() {
  return (
    <svg viewBox="0 0 64 48" className="pf-icon" aria-hidden="true">
      <path d="M23 3 h18 a2 2 0 0 1 1 3 l-2 2 h-16 l-2 -2 a2 2 0 0 1 1 -3 z" className="iv" />
      <rect x="28.5" y="8" width="7" height="3" rx="1" className="iv" />
      <rect x="30" y="11" width="4" height="5" className="iv" />
      <rect x="27" y="16" width="10" height="3" rx="1.5" className="iv" />
      <rect x="7" y="19" width="50" height="22" rx="5" className="iv" />
      <rect x="9.5" y="21.5" width="45" height="17" rx="3.5" className="iv thin" />
      <rect x="12" y="41" width="40" height="3" rx="1.5" className="iv thin" />
      <circle cx="20" cy="30" r="8.5" className="iv" />
      <circle cx="20" cy="30" r="6.5" className="iv thin" />
      <circle cx="20" cy="30" r="3" className="iv-lens" />
      <circle cx="20" cy="30" r="6.5" className="iv-pulse" />
      <circle cx="20" cy="30" r="6.5" className="iv-pulse b" />
      <rect x="32" y="24" width="6" height="4.5" rx="1.5" className="iv" />
      <rect x="32" y="31" width="6" height="4.5" rx="1.5" className="iv" />
      {[0, 1, 2, 3].map((k) => (
        <rect key={k} x="41.5" y={24 + k * 3.4} width="10" height="2" rx="1" className="iv-vent" style={{ animationDelay: `${k * 0.18}s` }} />
      ))}
    </svg>
  )
}

function LedIcon() {
  return (
    <svg viewBox="0 0 64 48" className="pf-icon" aria-hidden="true">
      <g transform="rotate(-38 32 24)">
        <rect x="3" y="17" width="58" height="14" rx="3" className="iv" />
        <rect x="5.5" y="19.5" width="53" height="9" rx="2" className="iv thin" />
        {[0, 1, 2].map((k) => (
          <rect key={'r' + k} x={8 + k * 18} y="21.3" width="5" height="1.6" rx="0.8" className="iv thin" />
        ))}
        {[0, 1, 2].map((k) => (
          <rect key={'q' + k} x={8 + k * 18} y="25" width="5" height="1.6" rx="0.8" className="iv thin" />
        ))}
        {[0, 1, 2].map((k) => (
          <g key={'c' + k}>
            <rect x={15.5 + k * 18} y="20.5" width="7" height="7" rx="1.2" className="iv" />
            <rect x={17 + k * 18} y="22" width="4" height="4" className="iv-chip" style={{ animationDelay: `${k * 0.25}s` }} />
          </g>
        ))}
        {[19, 22, 25, 28].map((y) => <line key={'a' + y} x1="0" y1={y} x2="3" y2={y} className="iv thin" />)}
        {[19, 22, 25, 28].map((y) => <line key={'b' + y} x1="61" y1={y} x2="64" y2={y} className="iv thin" />)}
      </g>
    </svg>
  )
}

function VolumetricIcon() {
  return (
    <svg viewBox="0 0 64 48" className="pf-icon" aria-hidden="true">
      <circle cx="32" cy="19" r="17" className="iv" />
      <circle cx="32" cy="19" r="14.5" className="iv thin" />
      <g className="iv-holo">
        <ellipse cx="32" cy="16.5" rx="10" ry="9.5" className="iv-shell" />
        <ellipse cx="32" cy="16.5" rx="10" ry="3.5" className="iv-shell b" />
        <ellipse cx="32" cy="16.5" rx="4" ry="9.5" className="iv-shell b" />
        <circle cx="32" cy="17" r="2.2" className="iv-core" />
      </g>
      <rect x="31" y="6" width="2" height="22" className="iv-blade" />
      <path d="M17 27 q15 -7 30 0 q-5 6 -15 6 q-10 0 -15 -6 z" className="iv" />
      <ellipse cx="32" cy="29.5" rx="4" ry="2" className="iv-rotor" />
      <path d="M26 33 h12 l5 12 h-22 z" className="iv" />
    </svg>
  )
}
const ICONS = [ProjectorIcon, LedIcon, VolumetricIcon]

export default function PhantomFlow() {
  const [active, setActive] = useState<number | null>(null)
  const wires = useRef<SVGSVGElement | null>(null)
  const [scale, setScale] = useState({ sx: 1, sy: 1 })
  useEffect(() => {
    const el = wires.current
    if (!el) return
    const ro = new ResizeObserver(() => {
      const r = el.getBoundingClientRect()
      if (r.width && r.height) setScale({ sx: r.width / 150, sy: r.height / 340 })
    })
    ro.observe(el)
    return () => ro.disconnect()
  }, [])

  return (
    <div className={active === null ? 'pflow' : 'pflow is-live'} role="img" aria-label="Diagram: RICO's audio analysis sends OSC to projection mapping, serial commands to an LED strip, and connects to the volumetric display over SSH.">
      <div className="pflow-src" aria-hidden="true">
        <span className="mini-logo"
          onPointerMove={(e) => depthMove(e, (dx, dy) => {
            (e.currentTarget as HTMLElement).style.setProperty('--ox', `${0.07 + dx * 0.12}em`);
            (e.currentTarget as HTMLElement).style.setProperty('--oy', `${0.07 + dy * 0.12}em`)
          })}
          onPointerLeave={(e) => { e.currentTarget.style.removeProperty('--ox'); e.currentTarget.style.removeProperty('--oy') }}>
          <span className="o">RICO</span><span className="f">RICO</span>
        </span>
        <span className="pflow-src-sub">AUDIO ANALYSIS</span>
        <span className="pflow-bars">
          {Array.from({ length: 10 }, (_, i) => <i key={i} style={{ animationDelay: `${(i * 0.137) % 1}s` }} />)}
        </span>
      </div>

      <svg ref={wires} className="pflow-wires" viewBox="0 0 150 340" preserveAspectRatio="none" aria-hidden="true">
        {ENDS.map((y, i) => active === i
          ? <LiveWire key={i} x1={0} y1={170} x2={150} y2={y} c1={[70, 170]} c2={[70, y]} dir="out" packet={6} sx={scale.sx} sy={scale.sy} className="pw" />
          : <path key={i} d={wirePath(y)} className="pw-line" />)}
      </svg>

      <ol className="pflow-outs" aria-hidden="true">
        {phantom.parts.map((p, i) => {
          const Icon = ICONS[i]
          return (
            <li key={p.name} className={active === i ? 'on' : ''}
              onMouseEnter={() => setActive(i)} onMouseLeave={() => setActive(null)}
              onClick={() => setActive(active === i ? null : i)}>
              <span className="pflow-proto">{PROTOS[i]}</span>
              <Icon />
              <span className="pflow-text"><strong>{p.name}</strong><small>{p.detail}</small></span>
            </li>
          )
        })}
      </ol>
    </div>
  )
}
