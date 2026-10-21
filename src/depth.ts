import type { PointerEvent } from 'react'

export function depthMove(e: PointerEvent<Element>, apply: (dx: number, dy: number) => void) {
  if (window.matchMedia?.('(prefers-reduced-motion: reduce)').matches) return
  const r = e.currentTarget.getBoundingClientRect()
  const dx = ((e.clientX - r.left) / r.width - 0.5) * -2 // -1..1, away from the pointer
  const dy = ((e.clientY - r.top) / r.height - 0.5) * -2
  apply(Math.max(-1, Math.min(1, dx)), Math.max(-1, Math.min(1, dy)))
}
