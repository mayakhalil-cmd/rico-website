import { useRef } from 'react'
import type { PointerEvent } from 'react'

const RINGS = 28

export default function Interference() {
  const bRef = useRef<SVGGElement | null>(null)
  const rings = Array.from({ length: RINGS }, (_, i) => 8 + i * 12)

  const onMove = (e: PointerEvent<HTMLDivElement>) => {
    const box = e.currentTarget.getBoundingClientRect()
    const x = ((e.clientX - box.left) / box.width) * 400 - 250
    const y = ((e.clientY - box.top) / box.height) * 300 - 150
    if (bRef.current) bRef.current.style.transform = `translate(${x}px, ${y}px)`
  }
  const onLeave = () => {
    if (bRef.current) bRef.current.style.transform = ''
  }

  return (
    <div className="interference" aria-hidden="true" onPointerMove={onMove} onPointerLeave={onLeave}>
      <svg viewBox="0 0 400 300" preserveAspectRatio="xMidYMid slice">
        <g className="wave-a">
          {rings.map((r) => <circle key={'a' + r} cx="150" cy="150" r={r} />)}
        </g>
        <g className="wave-b-wrap">
          <g className="wave-b" ref={bRef}>
            {rings.map((r) => <circle key={'b' + r} cx="250" cy="150" r={r} />)}
          </g>
        </g>
      </svg>
      <span className="interference-label">FIG. INTERFERENCE // move your pointer</span>
    </div>
  )
}
