import { useEffect, useMemo, useRef, useState } from 'react'
import { diagramNodes } from '../data/site'
import { useReducedMotion } from '../hooks'
import RoutingDiagram from './RoutingDiagram'
import ScrollLog from './ScrollLog'
import type { LogLine } from './ScrollLog'
import Section from './Section'
import Window from './Window'

const MIDI = 0, OSC = 1, SPOUT = 2, NDI = 3, DMX = 4, AUDIO = 5, SERIAL = 6
const TAGS = ['MIDI', 'OSC', 'SPOUT', 'NDI', 'DMX', 'AUDIO', 'SERIAL']

const ri = (a: number, b: number) => a + Math.floor(Math.random() * (b - a + 1))
const pick = <T,>(arr: T[]) => arr[ri(0, arr.length - 1)]
let frameNo = 1200

const ABOUT: Record<number, { what: string; how: string; apps: string }> = {
  [MIDI]: {
    what: 'Music controllers and keyboards.',
    how: 'RICO listens to every knob, fader and key, gives each one an address you can rename, and resends it as OSC values or DMX light levels.',
    apps: 'Ableton Live, Logic Pro, Bitwig, Reaper, VCV Rack, any USB MIDI controller',
  },
  [OSC]: {
    what: 'Network messages creative apps use to talk to each other.',
    how: 'RICO sends to many apps at once, each at its own IP and port, and turns incoming OSC back into MIDI or DMX.',
    apps: 'TouchDesigner, Unreal Engine, Unity, Max/MSP, Resolume, VCV Rack',
  },
  [SPOUT]: {
    what: 'Live video shared between apps on the same Windows PC, through the GPU.',
    how: 'RICO receives a Spout feed and passes it on with no recording or re-encoding. It carries pictures, not control values, so it runs side by side with your other signals.',
    apps: 'TouchDesigner, OBS, Resolume, After Effects',
  },
  [NDI]: {
    what: 'Live video over your local network.',
    how: 'RICO receives an NDI source from another computer and re-broadcasts it, or streams its own window. Like Spout, it carries video and runs side by side with control data.',
    apps: 'OBS, Resolume, TouchDesigner, vMix, NDI Tools',
  },
  [DMX]: {
    what: 'The standard for stage and installation lighting.',
    how: 'RICO sends Art-Net over the network, 512 channels per universe, so dimmers and RGB fixtures follow your controller, an app or the music.',
    apps: 'Art-Net nodes, DMX dimmers, LED fixtures, moving heads',
  },
  [AUDIO]: {
    what: 'Whatever your computer is playing: Spotify, YouTube, a DAW.',
    how: 'RICO splits the sound into six frequency bands, detects kicks, and sends the levels out as OSC values or serial commands.',
    apps: 'TouchDesigner, Unreal Engine, Resolume, LED strips and custom hardware',
  },
  [SERIAL]: {
    what: 'A USB cable to a microcontroller.',
    how: 'RICO sends short text commands like AUDIO:120,40,200 or PATTERN:6 that a board can read, so LEDs and custom builds join your setup.',
    apps: 'Raspberry Pi Pico, Arduino, ESP32, custom hardware',
  },
}

interface Made { what: string; inTxt: string; outTxt: string; dest: string; outTag?: string }

interface Route { from: number; to: number; steps: string[]; make: () => Made }
const ROUTES: Route[] = [
  { from: MIDI, to: OSC, steps: ['reads CC from your controller', 'scales 0–127 to 0–1', 'sends to each OSC app at its IP:port'], make: () => {
    const v = ri(0, 127), c = ri(1, 8)
    return { what: `You turned knob ${c}. TouchDesigner receives it as an OSC value from 0 to 1.`, inTxt: `CC ${20 + c} ch1 = ${v}`, outTxt: `/td/knob${c} ${(v / 127).toFixed(3)}`, dest: 'TouchDesigner · 127.0.0.1:9001' }
  } },
  { from: MIDI, to: OSC, steps: ['reads a key press', 'names it /game/key', 'sends it to Unreal'], make: () => {
    const n = ri(48, 72)
    return { what: `You pressed a key. Unreal Engine gets an OSC trigger to fire an event.`, inTxt: `Note On ${n} vel ${ri(60, 127)}`, outTxt: `/game/key${n - 47} 1`, dest: 'Unreal Engine · 127.0.0.1:8000' }
  } },
  { from: MIDI, to: DMX, steps: ['reads a fader', 'scales 0–127 to 0–255', 'writes it to a DMX channel'], make: () => {
    const v = ri(0, 127)
    return { what: `You moved a fader. RICO turns it into a light level, so the dimmer follows your hand.`, inTxt: `CC 7 ch1 = ${v}`, outTxt: `ch 1 → ${Math.round((v / 127) * 255)} / 255`, dest: 'Art-Net · universe 0' }
  } },
  { from: OSC, to: MIDI, steps: ['receives OSC from an app', 'scales 0–1 to 0–127', 'sends MIDI CC to your DAW'], make: () => {
    const f = Math.random()
    return { what: `A visual app sent an OSC fader value. RICO turns it back into MIDI for Ableton.`, inTxt: `/live/fader ${f.toFixed(3)}`, outTxt: `CC 12 ch1 = ${Math.round(f * 127)}`, dest: 'Ableton Live · MIDI out' }
  } },
  { from: OSC, to: DMX, steps: ['receives OSC from an app', 'scales 0–1 to 0–255', 'writes it to a DMX channel'], make: () => {
    const f = Math.random()
    return { what: `TouchDesigner sent an intensity value. RICO maps it onto a light.`, inTxt: `/td/intensity ${f.toFixed(3)}`, outTxt: `ch 3 → ${Math.round(f * 255)} / 255`, dest: 'Art-Net · universe 0' }
  } },
  { from: AUDIO, to: OSC, steps: ['captures system audio', 'splits it into 6 bands (FFT)', 'sends each band as OSC'], make: () => {
    const band = pick(['kick', 'snare', 'presence', 'sub']); const k = Math.random()
    return { what: `RICO hears the ${band} in the music and sends its level to TouchDesigner to drive a shader.`, inTxt: `${band} band ${k.toFixed(2)}`, outTxt: `/audio/${band} ${k.toFixed(3)}`, dest: 'TouchDesigner · 127.0.0.1:7000' }
  } },
  { from: AUDIO, to: SERIAL, steps: ['captures system audio', 'measures low / mid / high', 'writes a text command to the COM port'], make: () => {
    const [l, m, h] = [ri(0, 255), ri(0, 255), ri(0, 255)]
    return { what: `Low, mid and high levels go to a Raspberry Pi Pico, so the LED strip moves with the music.`, inTxt: `low ${(l / 255).toFixed(2)} · mid ${(m / 255).toFixed(2)} · high ${(h / 255).toFixed(2)}`, outTxt: `AUDIO:${l},${m},${h}`, dest: 'COM4 · LED strip' }
  } },
  { from: AUDIO, to: DMX, steps: ['captures system audio', 'takes the kick level', 'writes it to a dimmer channel'], make: () => {
    const k = Math.random()
    return { what: `The kick drum flashes a light: RICO writes its level straight to a DMX dimmer.`, inTxt: `kick band ${k.toFixed(2)}`, outTxt: `ch 1 → ${Math.round(k * 255)} / 255`, dest: 'Art-Net · universe 0' }
  } },
]

const SOLO: Record<number, () => Made> = {
  [MIDI]: () => { const c = ri(1, 8), v = ri(0, 127); return { what: `MIDI learn: RICO hears knob ${c} for the first time and gives it a name you can rename.`, inTxt: `CC ${20 + c} ch1 = ${v}`, outTxt: `learned /ctrl${c}`, dest: 'your mappings' } },
  [OSC]: () => { const f = Math.random(); return { what: `One message, two apps: RICO forwards TouchDesigner's value to Unreal at the same time.`, inTxt: `/td/speed ${f.toFixed(3)}`, outTxt: `/td/speed ${f.toFixed(3)}`, dest: 'Unreal Engine · 127.0.0.1:8000' } },
  [SPOUT]: () => { frameNo += ri(1, 3); const src = pick(['TDSpoutOut', 'OBS_Spout', 'Resolume_Out']); return { what: `A live texture passes to After Effects on the GPU while the other signals keep flowing.`, inTxt: `"${src}" 1920×1080 · frame ${frameNo}`, outTxt: 'shared texture', dest: 'After Effects', outTag: 'GPU' } },
  [NDI]: () => { frameNo += ri(1, 3); const src = pick(['STUDIO-PC (TD Out)', 'LAPTOP (OBS)', 'PROJECTOR-PC (Resolume)']); return { what: `A video feed from another computer is received and shared again under RICO's name.`, inTxt: `"${src}" 1920×1080 · frame ${frameNo}`, outTxt: 'send "RICO" @60fps', dest: 'any NDI app on the network' } },
  [DMX]: () => { const [a, b, c] = [ri(150, 255), ri(80, 200), ri(0, 120)]; return { what: `A lighting cue fires: RICO writes three channel levels to Art-Net.`, inTxt: 'cue "warm wash"', outTxt: `ch 1–3 → ${a}, ${b}, ${c}`, dest: 'Art-Net · universe 0' } },
  [AUDIO]: () => ({ what: `RICO splits what your computer is playing into six bands, ready to route.`, inTxt: 'system audio', outTxt: `kick ${Math.random().toFixed(2)} · snare ${Math.random().toFixed(2)} · air ${Math.random().toFixed(2)}`, dest: 'band meters in RICO' }),
  [SERIAL]: () => { const p = pick([['6', 'Audio Bars'], ['3', 'Sparkle'], ['7', 'Audio Pulse']]); return { what: `RICO tells the LED strip which pattern to run: ${p[1]}.`, inTxt: `pattern ${p[0]}`, outTxt: `PATTERN:${p[0]}`, dest: 'COM4 · LED strip' } },
}

export default function SignalMap() {
  const [selected, setSelected] = useState<number[]>([])
  const [lines, setLines] = useState<LogLine[]>([])
  const reduced = useReducedMotion()
  const idRef = useRef(0)

  const toggle = (i: number) => setSelected((prev) => (prev.includes(i) ? prev.filter((x) => x !== i) : [...prev, i]))

  const live = selected.length >= 2
  const active = useMemo(() => (live ? ROUTES.filter((r) => selected.includes(r.from) && selected.includes(r.to)) : []), [selected, live])
  const sending = [...new Set(active.map((r) => r.from))]
  const receiving = [...new Set(active.map((r) => r.to))]
  const solo = useMemo(() => (live ? selected.filter((i) => !active.some((r) => r.from === i || r.to === i)) : []), [selected, live, active])
  const pairs = useMemo(() => {
    const seen = new Map<string, Route>()
    for (const r of active) if (!seen.has(`${r.from}-${r.to}`)) seen.set(`${r.from}-${r.to}`, r)
    return [...seen.values()]
  }, [active])

  useEffect(() => {
    setLines([])
    if (!live) return
    const pool: { from: number; to: number; make: () => Made }[] = [
      ...active,
      ...solo.map((i) => ({ from: i, to: i, make: SOLO[i] })),
    ]
    if (!pool.length) return
    const push = () => {
      const r = pick(pool)
      const m = r.make()
      idRef.current++
      const ts = new Date().toLocaleTimeString([], { hour12: false })
      const content = (
        <span className="tx">
          <span className="tx-what"><span className="tx-ts">{ts}</span> {m.what}</span>
          <span className="tx-row">
            <span className="tx-in"><b className="tx-tag">{TAGS[r.from]}</b> {m.inTxt}</span>
            <span className="tx-arrow" aria-label="becomes">⟶</span>
            <span className="tx-out"><b className="tx-tag out">{m.outTag ?? TAGS[r.to]}</b> {m.outTxt}</span>
            <span className="tx-dest">→ {m.dest}</span>
          </span>
        </span>
      )
      setLines((prev) => [...prev, { id: idRef.current, content }].slice(-200))
    }
    push()
    if (reduced) return
    const t = window.setInterval(push, 2200)
    return () => clearInterval(t)
  }, [active, solo, live, reduced])

  const hint = selected.length === 0
    ? 'Pick two or more protocols above, for example MIDI and OSC, to watch RICO route between them.'
    : 'Pick one more protocol to start routing. Try MIDI + OSC, Audio + Serial, or OSC + DMX.'

  return (
    <Section
      id="map"
      index="01"
      title="One hub. Every signal."
      intro={<>RICO sits in the middle and translates between protocols in both directions. <span className="pink">Pick two or more</span> to route between them and see what RICO sends.</>}
    >
      <div className="map-grid">
        <figure className="map-figure">
          <RoutingDiagram selected={selected} live={live} sending={sending} receiving={receiving} onSelect={toggle} />
          <figcaption>
            <span className="key key-on" /> selected <span className="key key-out" /> routing · illustration, not a screenshot
          </figcaption>
        </figure>

        <div className="map-side">
          <div className="map-picker" role="group" aria-label="Choose protocols (pick two or more)">
            {diagramNodes.map((n, i) => (
              <button key={n} className={selected.includes(i) ? 'chip on' : 'chip'} aria-pressed={selected.includes(i)} onClick={() => toggle(i)}>
                {String(i + 1).padStart(2, '0')} {n}
              </button>
            ))}
          </div>

          {selected.length > 0 && (
            <ul className="map-about">
              {selected.map((i) => (
                <li key={i}>
                  <b className="ma-tag">{TAGS[i]}</b>
                  <p><strong>{ABOUT[i].what}</strong> {ABOUT[i].how}</p>
                  <p className="ma-apps"><span>Works with</span> {ABOUT[i].apps}</p>
                </li>
              ))}
            </ul>
          )}

          {live && (pairs.length > 0 || solo.length > 0) && (
            <ul className="map-routes" aria-label="Active routes">
              {pairs.map((r) => (
                <li key={`${r.from}-${r.to}`}>
                  <b>{TAGS[r.from]} → {TAGS[r.to]}</b>
                  <ol>{r.steps.map((s, k) => <li key={k}><span>{k + 1}</span>RICO {s}</li>)}</ol>
                </li>
              ))}
              {solo.length > 0 && (
                <li className="mr-solo">
                  <b>Side by side</b>
                  <p>{solo.map((i) => TAGS[i]).join(' + ')} {solo.length === 1 ? 'runs' : 'run'} through RICO at the same time as the other picks, each doing its own job.</p>
                </li>
              )}
            </ul>
          )}

          <Window title="RICO_TRANSLATE.LOG" status={live ? '● routing' : 'idle'}>
            <p className="tx-legend">
              Each entry shows <b>what happened</b>, the message that came <b className="lg-in">IN</b>, and
              what RICO sent <b className="lg-out">OUT</b> to which app.
            </p>
            <ScrollLog lines={lines} height="15em" empty={hint} label="Example RICO translations" />
          </Window>
        </div>
      </div>
    </Section>
  )
}
