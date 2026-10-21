import { useRef } from 'react'
import type { PointerEvent } from 'react'
import { useFinePointer, useReducedMotion } from '../hooks'

interface Props {
  text?: string
}

export default function LayeredWordmark({ text = 'RICO' }: Props) {
  const ref = useRef<HTMLDivElement | null>(null)
  const fine = useFinePointer()
  const reduced = useReducedMotion()

  const onMove = (e: PointerEvent<HTMLDivElement>) => {
    if (!fine || reduced || !ref.current) return
    const box = ref.current.getBoundingClientRect()
    const dx = ((e.clientX - box.left) / box.width - 0.5) * -2 // -1..1
    const dy = ((e.clientY - box.top) / box.height - 0.5) * -2
    ref.current.style.setProperty('--ox', `${0.07 + dx * 0.05}em`)
    ref.current.style.setProperty('--oy', `${0.07 + dy * 0.05}em`)
  }
  const onLeave = () => {
    ref.current?.style.removeProperty('--ox')
    ref.current?.style.removeProperty('--oy')
  }

  return (
    <div className="layered" ref={ref} onPointerMove={onMove} onPointerLeave={onLeave} role="img" aria-label={text}>
      <span className="layered-outline" aria-hidden="true">{text}</span>
      <span className="layered-fill" aria-hidden="true">{text}</span>
    </div>
  )
}
