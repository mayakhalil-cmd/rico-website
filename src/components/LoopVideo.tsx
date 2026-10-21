import { useEffect, useRef, useState } from 'react'
import { mediaUrl } from '../hooks'
import { claimSound, onSoundClaim } from '../soundBus'
import SoundButton from './SoundButton'

export default function LoopVideo({ file, poster, label }: { file: string; poster?: string; label: string }) {
  const ref = useRef<HTMLVideoElement | null>(null)
  const [muted, setMuted] = useState(true)

  useEffect(() => {
    const v = ref.current
    if (!v) return
    const io = new IntersectionObserver(([e]) => {
      if (e.isIntersecting) {
        if (!v.dataset.loaded) {
          v.dataset.loaded = '1'
          for (const [src, type] of [[file, 'video/mp4'], [file.replace(/\.mp4$/, '.webm'), 'video/webm']]) {
            const el = document.createElement('source')
            el.src = mediaUrl(src); el.type = type
            v.appendChild(el)
          }
          v.load()
        }
        v.play().catch(() => { /* autoplay blocked: the poster stays */ })
      } else v.pause()
    }, { rootMargin: '250px' })
    io.observe(v)
    const off = onSoundClaim((who) => { if (who !== file) { v.muted = true; setMuted(true) } })
    return () => { io.disconnect(); off() }
  }, [file])

  const toggle = () => {
    const v = ref.current
    if (!v) return
    if (muted) { claimSound(file); v.muted = false; v.volume = 0.85; v.play().catch(() => {}); setMuted(false) }
    else { v.muted = true; setMuted(true) }
  }

  return (
    <div className="vid">
      <video ref={ref} poster={poster ? mediaUrl(poster) : undefined} muted loop playsInline preload="none" aria-label={label} />
      <SoundButton muted={muted} onToggle={toggle} label={label} />
    </div>
  )
}
