import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import type { ChangeEvent, PointerEvent as RPointerEvent } from 'react'
import { useReducedMotion } from '../hooks'
import { labAudio, useAudioMode } from '../lab/audio'
import LabLog from '../lab/LabLog'
import { createLogStore } from '../lab/logStore'
import { BPM, FX_DEFS, LAYER_INFO, LAYER_TYPES, PRESETS, S, SOURCES, defsFor, makeFx, makeLayer } from '../lab/model'
import type { Blend, Def, Layer, LayerType, Param } from '../lab/model'
import { OUT_H, OUT_W, Renderer } from '../lab/render'
import type { Strokes } from '../lab/render'
import AudioControls from './AudioControls'
import Section from './Section'
import Window from './Window'

type Proto = 'OSC' | 'MIDI' | 'DMX' | 'MQTT' | 'NDI' | 'SPOUT'
const PROTOS: { id: Proto; note: string }[] = [
  { id: 'OSC', note: 'Sends every routed parameter as an OSC message' },
  { id: 'MIDI', note: 'Sends every routed parameter as a MIDI CC' },
  { id: 'DMX', note: 'Sends every routed parameter as a DMX light level' },
  { id: 'MQTT', note: 'Publishes every routed parameter to an MQTT broker' },
  { id: 'NDI', note: 'Streams the finished video over the network' },
  { id: 'SPOUT', note: 'Shares the finished video with apps on this PC' },
]
const DESTS = [
  { name: 'TouchDesigner', proto: 'OSC' as Proto, addr: '127.0.0.1:7000' },
  { name: 'Unreal Engine', proto: 'OSC' as Proto, addr: '127.0.0.1:8000' },
  { name: 'Resolume Arena', proto: 'NDI' as Proto, addr: 'RICO_WEB' },
  { name: 'Ableton Live', proto: 'MIDI' as Proto, addr: 'loopMIDI Port' },
  { name: 'After Effects', proto: 'SPOUT' as Proto, addr: 'RICO_WEB' },
  { name: 'OBS', proto: 'NDI' as Proto, addr: 'RICO_WEB' },
  { name: 'DMX lights', proto: 'DMX' as Proto, addr: 'universe 0' },
  { name: 'Custom', proto: 'OSC' as Proto, addr: '192.168.1.20:9000' },
]
const MAX_LAYERS = 8
const METER_CELLS = 14
const slug = (s: string) => s.toLowerCase().replace(/[^a-z0-9]+/g, '_').replace(/^_|_$/g, '') || 'layer'
const fmt = (d: Def, v: number) => (d.int ? String(Math.round(v)) : Math.abs(d.max - d.min) <= 2 ? v.toFixed(2) : v.toFixed(1))

const sampleSketch = (): number[][] => {
  const pts: number[] = []
  for (let i = 0; i <= 200; i++) {
    const a = (i / 200) * Math.PI * 2
    const r = 0.18 + 0.08 * Math.sin(a * 5)
    pts.push(0.5 + Math.cos(a) * r * 0.56, 0.5 + Math.sin(a) * r)
  }
  return [pts]
}

export default function SignalLab() {
  const reduced = useReducedMotion()
  const log = useMemo(() => createLogStore(), [])
  const audio = labAudio
  const rendererRef = useRef<Renderer | null>(null)
  const strokesRef = useRef<Strokes>(new Map())

  const initial = useMemo(() => {
    const p = PRESETS[0]
    return { layers: p.layers.map(makeLayer), fx: makeFx(p.fx) }
  }, [])
  const [layers, setLayers] = useState<Layer[]>(initial.layers)
  const [fx, setFx] = useState<Record<string, Param>>(initial.fx)
  const [selected, setSelected] = useState<number | null>(initial.layers[0]?.id ?? null)
  const [tab, setTab] = useState<'layer' | 'fx'>('layer')
  const [preset, setPreset] = useState(0)
  const [addType, setAddType] = useState<LayerType>('draw')
  const [drawing, setDrawing] = useState(false)
  const [, setStrokeTick] = useState(0)

  const { mode, hear } = useAudioMode()
  const [error, setError] = useState('')
  const [dest, setDest] = useState(0)
  const [proto, setProto] = useState<Proto>(DESTS[0].proto)
  const [addr, setAddr] = useState(DESTS[0].addr)
  const [sending, setSending] = useState(true)
  const [rec, setRec] = useState(0)

  const layersRef = useRef(layers), fxRef = useRef(fx), selRef = useRef(selected)
  const outRef = useRef({ dest, proto, addr, sending })
  useEffect(() => { layersRef.current = layers }, [layers])
  useEffect(() => { fxRef.current = fx }, [fx])
  useEffect(() => { selRef.current = selected }, [selected])
  useEffect(() => { outRef.current = { dest, proto, addr, sending } }, [dest, proto, addr, sending])

  const rootRef = useRef<HTMLDivElement | null>(null)
  const visRef = useRef<HTMLCanvasElement | null>(null)
  const scopeRef = useRef<HTMLCanvasElement | null>(null)
  const specRef = useRef<HTMLCanvasElement | null>(null)

  const sel = layers.find((l) => l.id === selected) ?? null

  useEffect(() => {
    const root = rootRef.current, vis = visRef.current
    if (!root || !vis) return
    if (!rendererRef.current) rendererRef.current = new Renderer()
    const R = rendererRef.current
    let raf = 0, visible = false, last = performance.now(), lastUi = 0, lastSend = 0, turn = 0, frame = 0
    const t0 = performance.now()

    const ro = new ResizeObserver((entries) => {
      for (const e of entries) {
        const c = e.target as HTMLCanvasElement
        const dpr = Math.min(window.devicePixelRatio || 1, 1.5)
        c.width = Math.round(c.clientWidth * dpr); c.height = Math.round(c.clientHeight * dpr)
      }
    })
    if (scopeRef.current) ro.observe(scopeRef.current)
    if (specRef.current) ro.observe(specRef.current)

    const tick = (now: number) => {
      raf = requestAnimationFrame(tick)
      if (!visible) { last = now; return }
      const dt = Math.min(0.05, (now - last) / 1000)
      last = now
      const t = (now - t0) / 1000
      frame++
      const src = audio.sample()
      R.render(vis, layersRef.current, fxRef.current, src, audio.wave, strokesRef.current, t, dt)
      if (scopeRef.current) drawScope(scopeRef.current, audio.wave, src[S.ONSET] > 0.6)
      if (specRef.current && frame % 2 === 0) drawSpectrum(specRef.current, audio.freq, audio.binHz)

      if (now - lastUi > 100) {
        lastUi = now
        root.querySelectorAll<HTMLElement>('[data-live]').forEach((el) => {
          el.style.width = `${((R.values.get(el.dataset.live!) ?? 0) * 100).toFixed(1)}%`
        })
        root.querySelectorAll<HTMLElement>('[data-meter]').forEach((el) => {
          const v = src[Number(el.dataset.meter)] ?? 0
          const n = Math.round(Math.min(1, v) * METER_CELLS)
          el.textContent = '█'.repeat(n) + '░'.repeat(METER_CELLS - n)
        })
        root.querySelectorAll<HTMLElement>('[data-meterval]').forEach((el) => {
          el.textContent = (src[Number(el.dataset.meterval)] ?? 0).toFixed(2)
        })
      }

      const out = outRef.current
      if (out.sending && now - lastSend > 420) {
        lastSend = now
        const items: { addr: string; v: number }[] = []
        for (const L of layersRef.current) {
          if (!L.visible) continue
          for (const d of defsFor(L.type)) if (L.p[d.id]?.src >= 0) items.push({ addr: `${slug(L.name)}/${d.id}`, v: R.values.get(`${L.id}.${d.id}`) ?? 0 })
        }
        for (const d of FX_DEFS) if (fxRef.current[d.id]?.src >= 0) items.push({ addr: `fx/${d.id}`, v: R.values.get(`fx.${d.id}`) ?? 0 })
        if (!items.length) {
          const L = layersRef.current.find((l) => l.id === selRef.current) ?? layersRef.current[0]
          if (L) for (const d of defsFor(L.type)) items.push({ addr: `${slug(L.name)}/${d.id}`, v: R.values.get(`${L.id}.${d.id}`) ?? 0 })
        }
        const name = DESTS[out.dest].name
        if (out.proto === 'NDI' || out.proto === 'SPOUT') {
          if (turn++ % 2 === 0) log.push(out.proto, `${out.proto === 'NDI' ? 'send' : 'sender'} "${out.addr}" ${OUT_W}×${OUT_H} · frame ${frame}`, `${name}${out.proto === 'NDI' ? ' (network)' : ' (GPU, this PC)'}`)
        } else if (items.length) {
          const it = items[turn++ % items.length], idx = (turn - 1) % items.length
          if (out.proto === 'OSC') log.push('OSC', `/rico/visual/${it.addr} ${it.v.toFixed(3)}`, `${name} ${out.addr}`)
          else if (out.proto === 'MIDI') log.push('MIDI', `CC ${20 + idx} ch1 = ${Math.round(it.v * 127)}  (${it.addr})`, `${name} · ${out.addr}`)
          else if (out.proto === 'DMX') log.push('DMX', `${out.addr} · ch ${idx + 1} → ${Math.round(it.v * 255)}  (${it.addr})`, name)
          else log.push('MQTT', `rico/visual/${it.addr} ${it.v.toFixed(3)}`, `${name} · broker`)
        }
      }
    }

    const io = new IntersectionObserver(([e]) => { visible = e.isIntersecting }, { rootMargin: '100px' })
    io.observe(root)
    if (reduced) { visible = true; tick(t0 + 16); cancelAnimationFrame(raf); visible = false }
    else raf = requestAnimationFrame(tick)
    return () => { cancelAnimationFrame(raf); io.disconnect(); ro.disconnect() }
  }, [audio, log, reduced])

  const startMic = async () => {
    setError('')
    try {
      await audio.startMic()
      log.push('RICO', 'audio capture started · input: microphone')
    } catch {
      setError('Microphone not available or permission was declined. Try the demo signal instead.')
    }
  }
  const startDemo = () => {
    setError(''); audio.startDemo()
    log.push('RICO', `audio capture started · input: demo beat ${BPM} bpm`)
  }
  const startFile = async (f: File | undefined) => {
    if (!f) return
    setError('')
    try {
      await audio.startFile(f)
      log.push('RICO', `audio capture started · input: ${f.name}`)
    } catch {
      setError('That file could not be played. Try an MP3, WAV or M4A.')
    }
  }
  const fileInput = useRef<HTMLInputElement | null>(null)
  const stopSound = () => audio.stop()
  const toggleHear = (on: boolean) => audio.setHear(on)
  const fire = () => { audio.pulse = 1; log.push('MIDI', 'Note On 36 vel 127 ch10 · PULSE fired') }

  const updateLayer = useCallback((id: number, patch: Partial<Layer>) => {
    setPreset(-1)
    setLayers((prev) => prev.map((l) => (l.id === id ? { ...l, ...patch } : l)))
  }, [])
  const updateParam = (id: number, pid: string, patch: Partial<Param>) => {
    setPreset(-1)
    setLayers((prev) => prev.map((l) => (l.id === id ? { ...l, p: { ...l.p, [pid]: { ...l.p[pid], ...patch } } } : l)))
    if (patch.src !== undefined) {
      const L = layers.find((l) => l.id === id)
      if (L) log.push('RICO', `route ${slug(L.name)}/${pid} ← ${patch.src < 0 ? 'none' : SOURCES[patch.src]}`)
    }
  }
  const updateFx = (pid: string, patch: Partial<Param>) => {
    setPreset(-1)
    setFx((prev) => ({ ...prev, [pid]: { ...prev[pid], ...patch } }))
    if (patch.src !== undefined) log.push('RICO', `route fx/${pid} ← ${patch.src < 0 ? 'none' : SOURCES[patch.src]}`)
  }

  const addLayer = (type: LayerType) => {
    if (layers.length >= MAX_LAYERS) return
    const L = makeLayer({ type })
    setLayers((prev) => [...prev, L])
    setSelected(L.id); setTab('layer'); setPreset(-1)
    if (type === 'draw') setDrawing(true)
    log.push('RICO', `added layer ${L.name.toLowerCase()}`)
    return L
  }
  const removeLayer = (id: number) => {
    setLayers((prev) => {
      const next = prev.filter((l) => l.id !== id)
      if (selected === id) setSelected(next[next.length - 1]?.id ?? null)
      return next
    })
    strokesRef.current.delete(id)
    setPreset(-1)
  }
  const moveLayer = (id: number, dir: -1 | 1) => {
    setLayers((prev) => {
      const i = prev.findIndex((l) => l.id === id), j = i + dir
      if (i < 0 || j < 0 || j >= prev.length) return prev
      const next = [...prev];[next[i], next[j]] = [next[j], next[i]]
      return next
    })
  }
  const duplicate = (id: number) => {
    const L = layers.find((l) => l.id === id)
    if (!L || layers.length >= MAX_LAYERS) return
    const copy = { ...makeLayer({ type: L.type }), name: `${L.name} copy`, blend: L.blend, color: { ...L.color }, text: L.text, p: JSON.parse(JSON.stringify(L.p)) as Layer['p'] }
    const st = strokesRef.current.get(id)
    if (st) strokesRef.current.set(copy.id, st.map((s) => [...s]))
    setLayers((prev) => [...prev, copy]); setSelected(copy.id)
  }

  const loadPreset = (i: number) => {
    const p = PRESETS[i]
    const ls = p.layers.map(makeLayer)
    strokesRef.current = new Map()
    ls.forEach((l) => { if (l.type === 'draw') strokesRef.current.set(l.id, sampleSketch()) })
    rendererRef.current?.clear()
    setLayers(ls); setFx(makeFx(p.fx)); setSelected(ls[0]?.id ?? null); setPreset(i); setTab('layer')
    setDrawing(false)
    log.push('RICO', `loaded visual preset ${p.name}`)
  }

  const drawTarget = sel?.type === 'draw' ? sel : null
  const startDrawing = () => {
    if (drawing) { setDrawing(false); return }
    if (!drawTarget) {
      const existing = layers.find((l) => l.type === 'draw')
      if (existing) setSelected(existing.id)
      else if (!addLayer('draw')) return
    }
    setDrawing(true); setTab('layer')
  }
  const cur = useRef<number[] | null>(null)
  const toNorm = (e: RPointerEvent<HTMLCanvasElement>) => {
    const r = e.currentTarget.getBoundingClientRect()
    return [Math.min(1, Math.max(0, (e.clientX - r.left) / r.width)), Math.min(1, Math.max(0, (e.clientY - r.top) / r.height))]
  }
  const onDown = (e: RPointerEvent<HTMLCanvasElement>) => {
    if (!drawing || !drawTarget) return
    e.currentTarget.setPointerCapture(e.pointerId)
    const list = strokesRef.current.get(drawTarget.id) ?? []
    const total = list.reduce((n, s) => n + s.length, 0)
    if (total > 12000) return 
    cur.current = toNorm(e)
    list.push(cur.current)
    strokesRef.current.set(drawTarget.id, list)
  }
  const onMove = (e: RPointerEvent<HTMLCanvasElement>) => {
    const c = cur.current
    if (!c) return
    const [x, y] = toNorm(e)
    const lx = c[c.length - 2], ly = c[c.length - 1]
    if (Math.abs(x - lx) + Math.abs(y - ly) > 0.004) c.push(x, y)
  }
  const onUp = () => {
    if (cur.current && cur.current.length < 4) cur.current.push(cur.current[0] + 0.002, cur.current[1] + 0.002)
    if (cur.current) setStrokeTick((n) => n + 1)
    cur.current = null
  }
  const undoStroke = () => {
    if (!drawTarget) return
    strokesRef.current.get(drawTarget.id)?.pop()
    setStrokeTick((n) => n + 1)
  }
  const clearStrokes = () => {
    if (!drawTarget) return
    strokesRef.current.set(drawTarget.id, [])
    setStrokeTick((n) => n + 1)
  }
  const strokeCount = drawTarget ? strokesRef.current.get(drawTarget.id)?.length ?? 0 : 0

  const record = () => {
    const canvas = visRef.current
    if (!canvas || rec > 0 || typeof MediaRecorder === 'undefined') return
    const stream = canvas.captureStream(30)
    const type = MediaRecorder.isTypeSupported('video/webm;codecs=vp9') ? 'video/webm;codecs=vp9' : 'video/webm'
    const mr = new MediaRecorder(stream, { mimeType: type })
    const chunks: Blob[] = []
    mr.ondataavailable = (e) => { if (e.data.size) chunks.push(e.data) }
    mr.onstop = () => {
      download(new Blob(chunks, { type: 'video/webm' }), `rico-visual-${Date.now()}.webm`)
      log.push('RICO', 'clip saved · rico-visual.webm')
    }
    mr.start(); setRec(5); log.push('RICO', 'recording 5 s clip…')
    let left = 5
    const iv = window.setInterval(() => { left--; setRec(left); if (left <= 0) { clearInterval(iv); mr.stop() } }, 1000)
  }
  const savePreset = () => {
    const data = {
      app: 'RICO Signal Lab', version: 2,
      layers: layers.map((l) => ({ type: l.type, name: l.name, visible: l.visible, blend: l.blend, color: l.color, text: l.text, p: l.p, strokes: strokesRef.current.get(l.id) ?? [] })),
      fx,
      output: { destination: DESTS[dest].name, protocol: proto, address: addr },
    }
    download(new Blob([JSON.stringify(data)], { type: 'application/json' }), 'rico-visual.json')
    log.push('RICO', 'visual saved · rico-visual.json')
  }
  const fileRef = useRef<HTMLInputElement | null>(null)
  const loadFile = async (e: ChangeEvent<HTMLInputElement>) => {
    const f = e.target.files?.[0]
    e.target.value = ''
    if (!f) return
    try {
      const data = JSON.parse(await f.text())
      if (!Array.isArray(data.layers)) throw new Error('no layers')
      const strokes: Strokes = new Map()
      const ls: Layer[] = data.layers.slice(0, MAX_LAYERS).filter((x: { type: string }) => LAYER_TYPES.includes(x.type as LayerType)).map((x: Record<string, unknown>) => {
        const L = makeLayer({ type: x.type as LayerType })
        if (typeof x.name === 'string') L.name = x.name.slice(0, 40)
        if (typeof x.text === 'string') L.text = x.text.slice(0, 40)
        if (typeof x.visible === 'boolean') L.visible = x.visible
        if (['add', 'normal', 'screen', 'difference'].includes(x.blend as string)) L.blend = x.blend as Blend
        const c = x.color as Layer['color'] | undefined
        if (c && (c.mode === 'iris' || c.mode === 'solid') && /^#[0-9a-f]{6}$/i.test(c.hex)) L.color = { mode: c.mode, hex: c.hex }
        const p = (x.p ?? {}) as Record<string, Partial<Param>>
        for (const d of defsFor(L.type)) {
          const q = p[d.id]
          if (q && typeof q.base === 'number') L.p[d.id] = { base: Math.min(d.max, Math.max(d.min, q.base)), src: typeof q.src === 'number' && q.src >= -1 && q.src < SOURCES.length ? q.src : -1, mult: typeof q.mult === 'number' ? Math.max(-1, Math.min(1, q.mult)) : 0.3 }
        }
        if (Array.isArray(x.strokes)) strokes.set(L.id, (x.strokes as unknown[]).filter(Array.isArray).map((s) => (s as unknown[]).filter((n): n is number => typeof n === 'number').map((n) => Math.min(1, Math.max(0, n)))))
        return L
      })
      const nfx = makeFx()
      if (data.fx) for (const d of FX_DEFS) { const q = data.fx[d.id]; if (q && typeof q.base === 'number') nfx[d.id] = { base: Math.min(d.max, Math.max(d.min, q.base)), src: typeof q.src === 'number' ? q.src : -1, mult: typeof q.mult === 'number' ? q.mult : 0.3 } }
      strokesRef.current = strokes
      rendererRef.current?.clear()
      setLayers(ls); setFx(nfx); setSelected(ls[0]?.id ?? null); setPreset(-1)
      log.push('RICO', `loaded visual · ${f.name}`)
    } catch {
      setError('That file is not a RICO visual (.json saved from this lab).')
    }
  }

  const live = mode !== 'off'
  const isVideo = proto === 'NDI' || proto === 'SPOUT'

  return (
    <Section
      id="lab"
      index="03"
      title="Signal Lab"
      intro="Build your own visual, drive it with sound, and send it to the app of your choice, the same way RICO does on your computer."
      className="lab-section"
    >
      <div ref={rootRef}>
        <div className="lab-controls">
          <button className={mode === 'mic' ? 'btn btn-primary' : 'btn'} onClick={startMic}>Use my microphone</button>
          <button className={mode === 'demo' ? 'btn btn-primary' : 'btn'} onClick={startDemo}>Play demo signal</button>
          <button className={mode === 'file' ? 'btn btn-primary' : 'btn'} onClick={() => fileInput.current?.click()}>Use my music</button>
          <input ref={fileInput} type="file" accept="audio/*" hidden onChange={(e) => { startFile(e.target.files?.[0]); e.target.value = '' }} />
          <button className="btn btn-pulse" onClick={fire}>Fire pulse</button>
          {mode === 'demo' && (
            <label className="toggle">
              <input type="checkbox" checked={hear} onChange={(e) => toggleHear(e.target.checked)} />
              <span>hear it</span>
            </label>
          )}
          {live && <button className="btn btn-ghost" onClick={stopSound}>Stop sound</button>}
          <span className={`lab-status ${live ? 'live' : ''}`} role="status">
            {mode === 'off' ? 'no sound · visual still runs' : mode === 'mic' ? '● live · microphone' : mode === 'file' ? `● live · ${audio.fileName}` : `● live · demo ${BPM} bpm`}
          </span>
        </div>
        <AudioControls sources={false} />
        {error && <p className="lab-error" role="alert">{error}</p>}

        <div className="lab-grid">
          {/* ─────────── BUILD ─────────── */}
          <Window title="BUILD.TOX" status={`${layers.length}/${MAX_LAYERS} layers`} className="lab-build">
            <div className="build-row">
              <span className="build-label">Start from</span>
              <div className="seg">
                {PRESETS.map((p, i) => (
                  <button key={p.name} className={i === preset ? 'chip on' : 'chip'} aria-pressed={i === preset} onClick={() => loadPreset(i)}>{p.name}</button>
                ))}
              </div>
            </div>

            <div className="layers">
              <div className="layers-head">
                <span className="build-label">Layers</span>
                <span className="layers-note">top of list draws first</span>
              </div>
              <ol className="layer-list">
                {layers.length === 0 && <li className="layer-empty">No layers yet. Add one below.</li>}
                {layers.map((l, i) => (
                  <li key={l.id} className={l.id === selected ? 'layer on' : 'layer'}>
                    <button className="layer-eye" aria-label={l.visible ? `Hide ${l.name}` : `Show ${l.name}`} aria-pressed={l.visible} onClick={() => updateLayer(l.id, { visible: !l.visible })}>
                      {l.visible ? '◉' : '○'}
                    </button>
                    <button className="layer-name" onClick={() => { setSelected(l.id); setTab('layer') }}>
                      <span>{l.name}</span><small>{LAYER_INFO[l.type].label}</small>
                    </button>
                    <span className="layer-tools">
                      <button aria-label="Move up" disabled={i === 0} onClick={() => moveLayer(l.id, -1)}>↑</button>
                      <button aria-label="Move down" disabled={i === layers.length - 1} onClick={() => moveLayer(l.id, 1)}>↓</button>
                      <button aria-label="Duplicate" disabled={layers.length >= MAX_LAYERS} onClick={() => duplicate(l.id)}>⧉</button>
                      <button aria-label={`Delete ${l.name}`} onClick={() => removeLayer(l.id)}>✕</button>
                    </span>
                  </li>
                ))}
              </ol>
              <div className="layer-add">
                <select value={addType} onChange={(e) => setAddType(e.target.value as LayerType)} aria-label="Layer type to add">
                  {LAYER_TYPES.map((t) => <option key={t} value={t}>{LAYER_INFO[t].label} · {LAYER_INFO[t].hint}</option>)}
                </select>
                <button className="chip on" onClick={() => addLayer(addType)} disabled={layers.length >= MAX_LAYERS}>+ Add layer</button>
              </div>
            </div>

            <div className="build-tabs" role="tablist" aria-label="Edit">
              <button role="tab" aria-selected={tab === 'layer'} className={tab === 'layer' ? 'chip on' : 'chip'} onClick={() => setTab('layer')}>
                {sel ? `Layer · ${sel.name}` : 'Layer'}
              </button>
              <button role="tab" aria-selected={tab === 'fx'} className={tab === 'fx' ? 'chip on' : 'chip'} onClick={() => setTab('fx')}>FX · whole visual</button>
            </div>

            {tab === 'layer' && sel && (
              <div className="inspector">
                <div className="insp-row">
                  <label><span className="build-label">Name</span>
                    <input type="text" value={sel.name} maxLength={40} onChange={(e) => updateLayer(sel.id, { name: e.target.value })} />
                  </label>
                  <label><span className="build-label">Blend</span>
                    <select value={sel.blend} onChange={(e) => updateLayer(sel.id, { blend: e.target.value as Blend })}>
                      <option value="add">Add (glow)</option><option value="screen">Screen</option>
                      <option value="normal">Normal</option><option value="difference">Difference</option>
                    </select>
                  </label>
                  <label><span className="build-label">Colour</span>
                    <span className="color-pick">
                      <button className={sel.color.mode === 'iris' ? 'chip on' : 'chip'} onClick={() => updateLayer(sel.id, { color: { ...sel.color, mode: 'iris' } })}>Iridescent</button>
                      <button className={sel.color.mode === 'solid' ? 'chip on' : 'chip'} onClick={() => updateLayer(sel.id, { color: { ...sel.color, mode: 'solid' } })}>Solid</button>
                      <input type="color" value={sel.color.hex} aria-label="Solid colour" onChange={(e) => updateLayer(sel.id, { color: { mode: 'solid', hex: e.target.value } })} />
                    </span>
                  </label>
                </div>
                {sel.type === 'text' && (
                  <label className="insp-text"><span className="build-label">Text</span>
                    <input type="text" value={sel.text} maxLength={40} onChange={(e) => updateLayer(sel.id, { text: e.target.value })} />
                  </label>
                )}
                {sel.type === 'draw' && (
                  <div className="draw-tools">
                    <button className={drawing ? 'chip on' : 'chip'} onClick={() => setDrawing((d) => !d)}>{drawing ? '✎ Drawing: on' : '✎ Draw on the visual'}</button>
                    <button className="chip" onClick={undoStroke} disabled={!strokeCount}>Undo</button>
                    <button className="chip" onClick={clearStrokes} disabled={!strokeCount}>Clear</button>
                    <span className="layers-note">{strokeCount} stroke{strokeCount === 1 ? '' : 's'}</span>
                  </div>
                )}
                <ParamTable defs={defsFor(sel.type)} params={sel.p} liveKey={(id) => `${sel.id}.${id}`} onChange={(pid, patch) => updateParam(sel.id, pid, patch)} />
              </div>
            )}
            {tab === 'layer' && !sel && <p className="layers-note">Add or select a layer to edit it.</p>}
            {tab === 'fx' && (
              <div className="inspector">
                <ParamTable defs={FX_DEFS} params={fx} liveKey={(id) => `fx.${id}`} onChange={updateFx} />
              </div>
            )}
          </Window>

          {/* ─────────── VISUAL (right next to its controls) ─────────── */}
          <Window title="VISUAL.OUT" status={rec > 0 ? `● REC ${rec}s` : drawing ? '✎ draw mode' : `${OUT_W} × ${OUT_H}`} className="lab-visual">
            <canvas
              ref={visRef}
              className={drawing && drawTarget ? 'lab-vis drawing' : 'lab-vis'}
              width={OUT_W}
              height={OUT_H}
              role="img"
              aria-label="The visual you are building"
              onPointerDown={onDown}
              onPointerMove={onMove}
              onPointerUp={onUp}
              onPointerCancel={onUp}
            />
            {drawing && drawTarget && <p className="draw-hint">Drag on the visual to draw into “{drawTarget.name}”. Turn on Kaleidoscope in FX for symmetry.</p>}
            <div className="vis-actions">
              <button className={drawing ? 'chip on' : 'chip'} onClick={startDrawing}>{drawing ? '✎ Stop drawing' : '✎ Draw'}</button>
              <button className="chip" onClick={record} disabled={rec > 0}>{rec > 0 ? `recording… ${rec}` : '● Record 5s (.webm)'}</button>
              <button className="chip" onClick={savePreset}>↓ Save visual (.json)</button>
              <button className="chip" onClick={() => fileRef.current?.click()}>↑ Load visual</button>
              <input ref={fileRef} type="file" accept="application/json,.json" hidden onChange={loadFile} />
            </div>
          </Window>

          {/* ─────────── SOUND ─────────── */}
          <Window title="SOURCES.FFT" status="what can drive a parameter" className="lab-sources">
            <div className="lab-input-inner">
              <canvas ref={scopeRef} className="lab-canvas" aria-hidden="true" />
              <canvas ref={specRef} className="lab-canvas" aria-hidden="true" />
            </div>
            <ul className="meters">
              {SOURCES.map((s, i) => (
                <li key={s} className={i >= S.ONSET ? 'meter-extra' : ''}>
                  <span className="meter-name">{s}</span>
                  <span className="meter-bar" aria-hidden="true" data-meter={i}>{'░'.repeat(METER_CELLS)}</span>
                  <span className="meter-val" data-meterval={i}>0.00</span>
                </li>
              ))}
            </ul>
          </Window>

          {/* ─────────── SEND ─────────── */}
          <Window title="SEND.OUT" status={sending ? '● sending' : 'paused'} className="lab-send">
            <div className="send-grid">
              <label>
                <span className="build-label">Send to</span>
                <select value={dest} onChange={(e) => { const i = Number(e.target.value); setDest(i); setProto(DESTS[i].proto); setAddr(DESTS[i].addr); log.push('RICO', `destination → ${DESTS[i].name} via ${DESTS[i].proto}`) }}>
                  {DESTS.map((d, i) => <option key={d.name} value={i}>{d.name}</option>)}
                </select>
              </label>
              <label>
                <span className="build-label">Protocol</span>
                <select value={proto} onChange={(e) => { setProto(e.target.value as Proto); log.push('RICO', `protocol → ${e.target.value}`) }}>
                  {PROTOS.map((p) => <option key={p.id} value={p.id}>{p.id}</option>)}
                </select>
              </label>
              <label>
                <span className="build-label">{isVideo ? 'Stream name' : proto === 'DMX' ? 'Universe' : proto === 'MIDI' ? 'MIDI port' : 'Address'}</span>
                <input type="text" value={addr} onChange={(e) => setAddr(e.target.value)} spellCheck={false} />
              </label>
              <button className={sending ? 'btn btn-primary' : 'btn'} onClick={() => setSending((v) => !v)}>{sending ? 'Sending' : 'Send'}</button>
            </div>
            <p className="send-note">
              {PROTOS.find((p) => p.id === proto)?.note}. A web page can't open network ports, so this log shows
              exactly what <b>RICO</b> sends. <a href="#download">Download RICO</a> to send it for real.
            </p>
            <LabLog store={log} />
          </Window>
        </div>

        <p className="lab-note">
          Band ranges, routing amounts and message formats come from RICO itself. Clips and saved visuals are
          real files you can keep. Microphone audio stays on your device.
        </p>
      </div>
    </Section>
  )
}

function ParamTable({ defs, params, liveKey, onChange }: {
  defs: Def[]
  params: Record<string, Param>
  liveKey: (id: string) => string
  onChange: (id: string, patch: Partial<Param>) => void
}) {
  return (
    <div className="matrix-wrap">
      <table className="matrix params">
        <thead><tr><th>Param</th><th>Value</th><th>Driven by</th><th>Amount</th><th>Live</th></tr></thead>
        <tbody>
          {defs.map((d) => {
            const p = params[d.id] ?? { base: d.def, src: -1, mult: 0.3 }
            return (
              <tr key={d.id}>
                <td className="mx-target">{d.label}</td>
                <td className="mx-val">
                  <input type="range" min={d.min} max={d.max} step={d.int ? 1 : (d.max - d.min) / 200} value={p.base}
                    onChange={(e) => onChange(d.id, { base: Number(e.target.value) })} aria-label={`${d.label} value`} />
                  <span className="mx-num">{fmt(d, p.base)}</span>
                </td>
                <td>
                  <select value={p.src} onChange={(e) => onChange(d.id, { src: Number(e.target.value) })} aria-label={`What drives ${d.label}`}>
                    <option value={-1}>—</option>
                    {SOURCES.map((s, k) => <option key={s} value={k}>{s}</option>)}
                  </select>
                </td>
                <td>
                  <input type="range" min={-1} max={1} step={0.02} value={p.mult} disabled={p.src < 0}
                    onChange={(e) => onChange(d.id, { mult: Number(e.target.value) })} aria-label={`${d.label} amount`} className="mult" />
                </td>
                <td className="mx-out"><span className="mx-bar" data-live={liveKey(d.id)} /></td>
              </tr>
            )
          })}
        </tbody>
      </table>
    </div>
  )
}

function download(blob: Blob, name: string) {
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url; a.download = name; a.click()
  setTimeout(() => URL.revokeObjectURL(url), 2000)
}

function drawScope(canvas: HTMLCanvasElement, wave: Uint8Array, hit: boolean) {
  const ctx = canvas.getContext('2d')!
  const w = canvas.width, h = canvas.height
  if (!w || !h) return
  ctx.fillStyle = 'rgba(0, 0, 0, 0.35)'; ctx.fillRect(0, 0, w, h)
  ctx.strokeStyle = hit ? '#f820a0' : '#3bff03'; ctx.lineWidth = 2
  ctx.beginPath()
  const step = wave.length / w
  for (let x = 0; x < w; x += 2) {
    const v = Math.max(-1, Math.min(1, (wave[Math.floor(x * step)] / 128 - 1) * 2.6))
    const y = h / 2 + v * h * 0.44
    if (x === 0) ctx.moveTo(x, y); else ctx.lineTo(x, y)
  }
  ctx.stroke()
}

function drawSpectrum(canvas: HTMLCanvasElement, freq: Uint8Array, binHz: number) {
  const ctx = canvas.getContext('2d')!
  const w = canvas.width, h = canvas.height
  if (!w || !h) return
  ctx.clearRect(0, 0, w, h)
  const bars = Math.max(24, Math.floor(w / 12)), bw = w / bars, cell = Math.max(5, Math.round(h / 12))
  const green = new Path2D(), pink = new Path2D()
  for (let i = 0; i < bars; i++) {
    const f0 = 30 * Math.pow(600, i / bars), f1 = 30 * Math.pow(600, (i + 1) / bars)
    const b0 = Math.floor(f0 / binHz), b1 = Math.max(b0 + 1, Math.floor(f1 / binHz))
    let m = 0
    for (let k = b0; k < b1 && k < freq.length; k++) m = Math.max(m, freq[k])
    const cells = Math.floor((m / 255) * (h / cell))
    for (let c = 0; c < cells; c++) (c === cells - 1 ? pink : green).rect(i * bw + 1, h - (c + 1) * cell + 1, bw - 2, cell - 2)
  }
  ctx.fillStyle = '#3bff03'; ctx.fill(green)
  ctx.fillStyle = '#f820a0'; ctx.fill(pink)
}
