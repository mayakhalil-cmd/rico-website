import { useEffect, useRef, useState } from 'react'
import { claimSound, onSoundClaim } from '../soundBus'
import SoundButton from './SoundButton'



interface Props {
  id: string 
  start: number 
  end: number 
  title: string 
}

interface YTPlayer {
  playVideo(): void; pauseVideo(): void; mute(): void; unMute(): void; setVolume(v: number): void
  seekTo(s: number, allow: boolean): void; getCurrentTime(): number; destroy(): void
  unloadModule?(name: string): void; setOption?(module: string, option: string, value: unknown): void
}
interface YTNamespace {
  Player: new (el: HTMLElement, opts: Record<string, unknown>) => YTPlayer
  PlayerState: { ENDED: number; PLAYING: number; PAUSED: number }
}
declare global { interface Window { YT?: YTNamespace; onYouTubeIframeAPIReady?: () => void } }

let apiPromise: Promise<YTNamespace> | null = null
function loadApi(): Promise<YTNamespace> {
  if (window.YT?.Player) return Promise.resolve(window.YT)
  if (apiPromise) return apiPromise
  apiPromise = new Promise((resolve) => {
    const prev = window.onYouTubeIframeAPIReady
    window.onYouTubeIframeAPIReady = () => { prev?.(); resolve(window.YT!) }
    const s = document.createElement('script')
    s.src = 'https://www.youtube.com/iframe_api'
    s.async = true
    document.head.appendChild(s)
  })
  return apiPromise
}

const noCaptions = (p: YTPlayer | null) => {
  try { p?.unloadModule?.('captions') } catch { /* not loaded */ }
  try { p?.unloadModule?.('cc') } catch { /* not loaded */ }
  try { p?.setOption?.('captions', 'track', {}) } catch { /* not supported */ }
}

export default function YouTubeClip({ id, start, end, title }: Props) {
  const owner = `${id}@${start}`
  const box = useRef<HTMLDivElement | null>(null)
  const mount = useRef<HTMLDivElement | null>(null)
  const player = useRef<YTPlayer | null>(null)
  const [ready, setReady] = useState(false)
  const [muted, setMuted] = useState(true)

  useEffect(() => {
    const el = box.current, wrap = mount.current
    if (!el || !wrap) return
    let cancelled = false, created = false, visible = false, timer = 0

    const create = async () => {
      created = true
      const YT = await loadApi()
      if (cancelled) return
      const host = document.createElement('div') 
      wrap.appendChild(host)
      player.current = new YT.Player(host, {
        host: 'https://www.youtube-nocookie.com',
        videoId: id,
        playerVars: {
          start, end, autoplay: 1, mute: 1, controls: 0, disablekb: 1, fs: 0, modestbranding: 1,
          playsinline: 1, rel: 0, iv_load_policy: 3, cc_load_policy: 0, enablejsapi: 1,
          origin: window.location.origin,
        },
        events: {
          onReady: () => {
            const p = player.current
            p?.mute(); noCaptions(p)
            if (visible) p?.playVideo()
          },
          onStateChange: (e: { data: number }) => {
            const p = player.current
            if (e.data === YT.PlayerState.PLAYING) { setReady(true); noCaptions(p) }
            if (e.data === 2 || e.data === 0 || e.data === 5 || e.data === -1) setReady(false)
            if (e.data === YT.PlayerState.ENDED) { p?.seekTo(start, true); p?.playVideo() }
          },
        },
      })
      timer = window.setInterval(() => {
        try { const p = player.current; if (p && p.getCurrentTime() >= end - 0.35) p.seekTo(start, true) } catch { /* not ready */ }
      }, 250)
    }

    const io = new IntersectionObserver(([e]) => {
      visible = e.isIntersecting
      if (visible && !created) create()
      try { if (visible) player.current?.playVideo(); else player.current?.pauseVideo() } catch { /* not ready */ }
    }, { rootMargin: '250px' })
    io.observe(el)

    const off = onSoundClaim((who) => {
      if (who !== owner) { try { player.current?.mute() } catch { /* not ready */ } setMuted(true) }
    })

    return () => {
      cancelled = true
      io.disconnect(); off(); clearInterval(timer)
      try { player.current?.destroy() } catch { /* gone */ }
      player.current = null
      wrap.replaceChildren()
      setReady(false)
    }
  }, [id, start, end, owner])

  const toggle = () => {
    const p = player.current
    if (muted) {
      claimSound(owner)
      try { p?.unMute(); p?.setVolume(85); p?.playVideo() } catch { /* not ready */ }
      setMuted(false)
    } else {
      try { p?.mute() } catch { /* not ready */ }
      setMuted(true)
    }
  }

  return (
    <div className="vid yt" ref={box}>
      <div className="yt-mount" ref={mount} />
      {/* a cover so it behaves like a video loop: no YouTube title bar or buttons on hover */}
      <span className={ready ? 'yt-cover ready' : 'yt-cover'} aria-hidden="true">
        {!ready && <span className="yt-loading">{title.toLowerCase()}</span>}
      </span>
      <span className="sr-only">{title}</span>
      <SoundButton muted={muted} onToggle={toggle} label={title} />
    </div>
  )
}
