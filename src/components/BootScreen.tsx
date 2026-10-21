import { useEffect, useState } from 'react'
import { release } from '../data/site'
import { useReducedMotion } from '../hooks'


const LINES = [
  `RICO ${release.version} :: real-time integration control operations`,
  'loading midi ............ [ ok ]',
  'loading osc ............. [ ok ]',
  'loading spout / ndi ..... [ ok ]',
  'loading dmx / art-net ... [ ok ]',
  'loading audio fft ....... [ ok ]',
  'loading serial .......... [ ok ]',
  'routing table ready.',
]

const KEY = 'rico-booted'

function alreadyBooted() {
  try { return sessionStorage.getItem(KEY) === '1' } catch { return false }
}

export default function BootScreen() {
  const reduced = useReducedMotion()
  const [shown, setShown] = useState(() => !alreadyBooted())
  const [count, setCount] = useState(0)
  const [leaving, setLeaving] = useState(false)

  useEffect(() => {
    if (!shown || reduced) return
    try { sessionStorage.setItem(KEY, '1') } catch { /* private mode: ignore */ }
    const timers: number[] = []
    LINES.forEach((_, i) => timers.push(window.setTimeout(() => setCount(i + 1), 90 + i * 110)))
    timers.push(window.setTimeout(() => setLeaving(true), 90 + LINES.length * 110 + 250))
    timers.push(window.setTimeout(() => setShown(false), 90 + LINES.length * 110 + 750))
    const skip = () => { setLeaving(true); window.setTimeout(() => setShown(false), 300) }
    window.addEventListener('keydown', skip, { once: true })
    window.addEventListener('pointerdown', skip, { once: true })
    return () => {
      timers.forEach(clearTimeout)
      window.removeEventListener('keydown', skip)
      window.removeEventListener('pointerdown', skip)
    }
  }, [shown, reduced])

  if (!shown || reduced) return null

  return (
    <div className={leaving ? 'boot leaving' : 'boot'} aria-hidden="true">
      <pre className="boot-text">
        {LINES.slice(0, count).join('\n')}
        <span className="cursor" />
      </pre>
      <span className="boot-skip">click or press any key to skip</span>
    </div>
  )
}
