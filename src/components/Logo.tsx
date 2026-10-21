import { useEffect, useRef, useState } from 'react'
import type { PointerEvent } from 'react'
import { logoHover } from '../data/site'
import { useFinePointer, useReducedMotion } from '../hooks'

interface LogoProps {
  size?: 'nav' | 'hero' | 'footer'
  underscore?: boolean // the blinking "_" from the app icon
}

// Characters the letters cycle through in the coding-style hover effects
const CODE = '{}[]<>/\\=+*#;:01'
const WORD = 'RICO'
const HEX = ['52', '49', '43', '4F'] // RICO in ASCII hex

// The RICO logo in Teletactile, built from two layers:
// a white OUTLINE underneath, offset down-right, and the FILLED word on top.
// The hover effect is chosen in src/data/site.ts → logoHover.
export default function Logo({ size = 'nav', underscore = true }: LogoProps) {
  const reduced = useReducedMotion()
  const fine = useFinePointer()
  const [letters, setLetters] = useState<string[]>(WORD.split(''))
  const [busy, setBusy] = useState(false)
  const raf = useRef(0)
  const box = useRef<HTMLSpanElement | null>(null)

  useEffect(() => () => cancelAnimationFrame(raf.current), [])

  const play = () => {
    if (reduced || busy) return
    if (logoHover !== 'decode' && logoHover !== 'hex' && logoHover !== 'binary') return
    setBusy(true)
    const start = performance.now()
    const dur = 700
    const tick = (now: number) => {
      const t = (now - start) / dur
      setLetters(
        WORD.split('').map((ch, i) => {
          const settle = 0.35 + i * 0.16 // letters lock in one after another
          if (t >= settle) return ch
          if (logoHover === 'hex') return t < settle - 0.12 ? HEX[i][Math.floor(now / 90 + i) % 2] : ch
          if (logoHover === 'binary') return Math.random() < 0.5 ? '0' : '1'
          return CODE[(Math.random() * CODE.length) | 0]
        }),
      )
      if (t < 1) raf.current = requestAnimationFrame(tick)
      else { setLetters(WORD.split('')); setBusy(false) }
    }
    raf.current = requestAnimationFrame(tick)
  }

  // the outline layer drifts slightly away from the mouse, for depth
  const onMove = (e: PointerEvent<HTMLSpanElement>) => {
    if (!fine || reduced || !box.current) return
    const r = box.current.getBoundingClientRect()
    const dx = ((e.clientX - r.left) / r.width - 0.5) * -2
    const dy = ((e.clientY - r.top) / r.height - 0.5) * -2
    box.current.style.setProperty('--ox', `${0.06 + dx * 0.04}em`)
    box.current.style.setProperty('--oy', `${0.06 + dy * 0.04}em`)
  }
  const onLeave = () => {
    box.current?.style.removeProperty('--ox')
    box.current?.style.removeProperty('--oy')
  }

  const word = letters.map((ch, i) => (
    <span key={i} className={ch === WORD[i] ? 'lch' : 'lch coding'}>{ch}</span>
  ))

  return (
    <span
      ref={box}
      className={`logo3d logo-${size} fx-${logoHover}${busy ? ' is-coding' : ''}`}
      role="img"
      aria-label="RICO"
      onPointerEnter={play}
      onPointerMove={onMove}
      onPointerLeave={onLeave}
    >
      <span className="l-outline" aria-hidden="true">
        {word}{underscore && <span className="logo-underscore">_</span>}
      </span>
      <span className="l-fill" aria-hidden="true">
        {word}{underscore && <span className="logo-underscore">_</span>}
      </span>
    </span>
  )
}
