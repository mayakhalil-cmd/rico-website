import { useEffect, useState } from 'react'
import { useInView, useReducedMotion } from '../hooks'

const GLYPHS = '!<>-_\\/[]{}=+*^?#01ABCDEFGHIJKLMNOPQRSTUVWXYZ'

interface ScrambleTextProps {
  text: string
  as?: 'span' | 'h1' | 'h2' | 'h3'
  id?: string
  className?: string
  delay?: number 
}

export default function ScrambleText({ text, as = 'span', id, className, delay = 0 }: ScrambleTextProps) {
  const reduced = useReducedMotion()
  const { ref, seen } = useInView<HTMLElement>()
  const [out, setOut] = useState(text)

  useEffect(() => {
    if (!seen || reduced) return
    let frame = 0
    let raf = 0
    const total = 22 + text.length * 1.2
    const start = performance.now() + delay
    const tick = (now: number) => {
      if (now < start) { raf = requestAnimationFrame(tick); return }
      frame++
      const progress = frame / total
      setOut(
        text.split('').map((ch, i) => {
          if (ch === ' ') return ' '
          if (i / text.length < progress) return ch
          return GLYPHS[(Math.random() * GLYPHS.length) | 0]
        }).join(''),
      )
      if (frame < total) raf = requestAnimationFrame(tick)
      else setOut(text)
    }
    raf = requestAnimationFrame(tick)
    return () => cancelAnimationFrame(raf)
  }, [seen, reduced, text, delay])

  const Tag = as
  return (
    <Tag ref={ref as never} id={id} className={className} aria-label={text}>
      <span aria-hidden="true">{out}</span>
    </Tag>
  )
}
