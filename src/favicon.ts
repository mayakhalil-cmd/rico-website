export function startFavicon() {
  if (typeof document === 'undefined') return
  const reduced = window.matchMedia?.('(prefers-reduced-motion: reduce)').matches
  const S = 64, C = S / 2, R = 19
  const canvas = document.createElement('canvas')
  canvas.width = canvas.height = S
  const ctx = canvas.getContext('2d')
  if (!ctx) return

  document.querySelectorAll('link[rel~="icon"]').forEach((l) => l.remove())
  const link = document.createElement('link')
  link.rel = 'icon'; link.type = 'image/png'
  document.head.appendChild(link)

  const STOPS = ['#b9a8ff', '#ff4fd8', '#ffb347', '#fff6c9', '#4ff3ff', '#3d5cff', '#b9a8ff']
  const ringPaint = (a: number) => {
    if ('createConicGradient' in ctx) {
      const g = ctx.createConicGradient(a, C, C)
      STOPS.forEach((c, i) => g.addColorStop(i / (STOPS.length - 1), c))
      return g
    }
    const g = (ctx as CanvasRenderingContext2D).createLinearGradient(C + Math.cos(a) * R, C + Math.sin(a) * R, C - Math.cos(a) * R, C - Math.sin(a) * R)
    STOPS.forEach((c, i) => g.addColorStop(i / (STOPS.length - 1), c))
    return g
  }

  let frame = 0
  const draw = () => {
    frame++
    const t = frame / 12, a = t * 0.9
    ctx.clearRect(0, 0, S, S)
    ctx.fillStyle = '#05040a'
    ctx.beginPath(); ctx.roundRect(0, 0, S, S, 14); ctx.fill()
    ctx.lineWidth = 11
    ctx.globalCompositeOperation = 'lighter'
    ctx.strokeStyle = 'rgba(255, 40, 80, 0.55)'
    ctx.beginPath(); ctx.arc(C + 1.6, C, R, 0, Math.PI * 2); ctx.stroke()
    ctx.strokeStyle = 'rgba(40, 90, 255, 0.6)'
    ctx.beginPath(); ctx.arc(C - 1.6, C, R, 0, Math.PI * 2); ctx.stroke()
    ctx.globalCompositeOperation = 'source-over'
    ctx.strokeStyle = ringPaint(a)
    ctx.beginPath(); ctx.arc(C, C, R, 0, Math.PI * 2); ctx.stroke()
    ctx.lineWidth = 3
    ctx.strokeStyle = 'rgba(5, 4, 10, 0.55)'
    ctx.beginPath(); ctx.arc(C, C, R, 0, Math.PI * 2); ctx.stroke()
    ctx.lineWidth = 2.5
    ctx.strokeStyle = 'rgba(255, 255, 255, 0.95)'
    ctx.beginPath(); ctx.arc(C, C, R + 3, -a * 1.3 - 0.5, -a * 1.3 + 0.2); ctx.stroke()
    const pulse = reduced ? 0.5 : 0.5 + 0.5 * Math.sin(t * 3.2)
    ctx.fillStyle = `rgba(59, 255, 3, ${0.25 + 0.3 * pulse})`
    ctx.beginPath(); ctx.arc(C, C, 6 + pulse * 3, 0, Math.PI * 2); ctx.fill()
    ctx.fillStyle = '#3bff03'
    ctx.beginPath(); ctx.arc(C, C, 4.2, 0, Math.PI * 2); ctx.fill()
    link.href = canvas.toDataURL('image/png')
  }
  draw()
  if (!reduced) window.setInterval(draw, 1000 / 12)
}
