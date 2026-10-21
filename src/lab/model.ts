export const BANDS = [
  { label: 'SUB', lo: 20, hi: 80 },
  { label: 'KICK', lo: 60, hi: 130 },
  { label: 'SNARE', lo: 150, hi: 500 },
  { label: 'MIDRANGE', lo: 500, hi: 3000 },
  { label: 'PRESENCE', lo: 3000, hi: 8000 },
  { label: 'AIR', lo: 8000, hi: 18000 },
]
export const SOURCES = [...BANDS.map((b) => b.label), 'KICK ONSET', 'LFO 1', 'PULSE']
export const S = { SUB: 0, KICK: 1, SNARE: 2, MID: 3, PRES: 4, AIR: 5, ONSET: 6, LFO: 7, PULSE: 8 }
export const BPM = 124

export interface Param { base: number; src: number; mult: number }
export interface Def { id: string; label: string; min: number; max: number; def: number; int?: boolean }

export type LayerType = 'ring' | 'polygon' | 'rays' | 'waves' | 'particles' | 'dots' | 'draw' | 'text'
export type Blend = 'add' | 'normal' | 'screen' | 'difference'

export interface Layer {
  id: number
  type: LayerType
  name: string
  visible: boolean
  blend: Blend
  color: { mode: 'iris' | 'solid'; hex: string }
  text: string
  p: Record<string, Param>
}

const COMMON: Def[] = [
  { id: 'opacity', label: 'Opacity', min: 0, max: 1, def: 1 },
  { id: 'x', label: 'Position X', min: 0, max: 1, def: 0.5 },
  { id: 'y', label: 'Position Y', min: 0, max: 1, def: 0.5 },
]

export const DEFS: Record<LayerType, Def[]> = {
  ring: [
    { id: 'radius', label: 'Radius', min: 0.02, max: 0.6, def: 0.28 },
    { id: 'thickness', label: 'Thickness', min: 1, max: 60, def: 14 },
    { id: 'warp', label: 'Warp', min: 0, max: 1, def: 0.2 },
    { id: 'spin', label: 'Spin', min: -3, max: 3, def: 0.3 },
    { id: 'glow', label: 'Glow', min: 0, max: 1, def: 0.6 },
  ],
  polygon: [
    { id: 'sides', label: 'Sides', min: 3, max: 12, def: 6, int: true },
    { id: 'copies', label: 'Copies', min: 1, max: 16, def: 7, int: true },
    { id: 'radius', label: 'Radius', min: 0.02, max: 0.6, def: 0.32 },
    { id: 'twist', label: 'Twist', min: 0, max: 1, def: 0.25 },
    { id: 'spin', label: 'Spin', min: -3, max: 3, def: 0.3 },
    { id: 'thickness', label: 'Thickness', min: 0.5, max: 12, def: 2 },
  ],
  rays: [
    { id: 'count', label: 'Count', min: 4, max: 320, def: 140, int: true },
    { id: 'length', label: 'Length', min: 0.05, max: 0.7, def: 0.34 },
    { id: 'bend', label: 'Bend', min: 0, max: 2, def: 0.7 },
    { id: 'spin', label: 'Spin', min: -3, max: 3, def: 0.15 },
    { id: 'thickness', label: 'Thickness', min: 0.5, max: 6, def: 1.4 },
  ],
  waves: [
    { id: 'lines', label: 'Lines', min: 2, max: 40, def: 18, int: true },
    { id: 'amplitude', label: 'Amplitude', min: 0, max: 0.4, def: 0.1 },
    { id: 'speed', label: 'Speed', min: 0, max: 6, def: 1.2 },
    { id: 'audio', label: 'Audio shape', min: 0, max: 1, def: 0.5 },
    { id: 'spread', label: 'Spread', min: 0.05, max: 1, def: 0.75 },
    { id: 'thickness', label: 'Thickness', min: 0.5, max: 6, def: 1.5 },
  ],
  particles: [
    { id: 'rate', label: 'Rate / sec', min: 0, max: 300, def: 60 },
    { id: 'speed', label: 'Speed', min: 0, max: 0.8, def: 0.22 },
    { id: 'size', label: 'Size', min: 1, max: 14, def: 3 },
    { id: 'life', label: 'Life (s)', min: 0.2, max: 4, def: 1.6 },
    { id: 'gravity', label: 'Gravity', min: -1, max: 1, def: 0 },
  ],
  dots: [
    { id: 'spacing', label: 'Spacing', min: 10, max: 60, def: 24 },
    { id: 'size', label: 'Dot size', min: 0, max: 1, def: 0.6 },
    { id: 'wave', label: 'Wave', min: 0, max: 1, def: 0.6 },
    { id: 'speed', label: 'Speed', min: 0, max: 6, def: 1.5 },
  ],
  draw: [
    { id: 'thickness', label: 'Thickness', min: 0.5, max: 24, def: 3 },
    { id: 'wobble', label: 'Wobble', min: 0, max: 0.06, def: 0.01 },
    { id: 'echoes', label: 'Echoes', min: 1, max: 12, def: 4, int: true },
    { id: 'spin', label: 'Spin', min: -3, max: 3, def: 0.2 },
    { id: 'scale', label: 'Scale', min: 0.2, max: 2, def: 1 },
  ],
  text: [
    { id: 'size', label: 'Size', min: 0.04, max: 0.5, def: 0.16 },
    { id: 'spin', label: 'Spin', min: -3, max: 3, def: 0 },
    { id: 'jitter', label: 'Jitter', min: 0, max: 0.05, def: 0.004 },
    { id: 'tracking', label: 'Letter spacing', min: 0, max: 0.6, def: 0.12 },
  ],
}
export const defsFor = (t: LayerType) => [...COMMON, ...DEFS[t]]

export const LAYER_INFO: Record<LayerType, { label: string; hint: string }> = {
  ring: { label: 'Ring', hint: 'a glowing iridescent ring' },
  polygon: { label: 'Polygon', hint: 'nested shapes that twist' },
  rays: { label: 'Rays', hint: 'a bloom of curved lines' },
  waves: { label: 'Waves', hint: 'lines shaped by the sound' },
  particles: { label: 'Particles', hint: 'sparks that burst out' },
  dots: { label: 'Dots', hint: 'a halftone grid that ripples' },
  draw: { label: 'Draw', hint: 'paint your own shapes on the canvas' },
  text: { label: 'Text', hint: 'type any word' },
}
export const LAYER_TYPES = Object.keys(LAYER_INFO) as LayerType[]

export const FX_DEFS: Def[] = [
  { id: 'trails', label: 'Trails', min: 0, max: 0.97, def: 0.6 },
  { id: 'zoom', label: 'Feedback zoom', min: -0.05, max: 0.08, def: 0 },
  { id: 'rotate', label: 'Feedback spin', min: -0.05, max: 0.05, def: 0 },
  { id: 'kaleido', label: 'Kaleidoscope', min: 0, max: 12, def: 0, int: true },
  { id: 'glitch', label: 'Glitch', min: 0, max: 1, def: 0 },
  { id: 'hue', label: 'Hue shift', min: 0, max: 1, def: 0 },
  { id: 'hueSpeed', label: 'Hue drift', min: 0, max: 1, def: 0.08 },
]

export const evalParam = (d: Def, p: Param | undefined, src: number[]) => {
  const base = p ? p.base : d.def
  const add = p && p.src >= 0 ? (src[p.src] ?? 0) * p.mult * (d.max - d.min) : 0
  const v = Math.max(d.min, Math.min(d.max, base + add))
  return d.int ? Math.round(v) : v
}

let nextId = 1
export const newId = () => nextId++

type ParamPatch = Record<string, Partial<Param> | number>
const makeParams = (defs: Def[], patch: ParamPatch = {}) => {
  const out: Record<string, Param> = {}
  for (const d of defs) {
    const v = patch[d.id]
    const base: Param = { base: d.def, src: -1, mult: 0.3 }
    out[d.id] = typeof v === 'number' ? { ...base, base: v } : { ...base, ...(v ?? {}) }
  }
  return out
}

export interface LayerSpec {
  type: LayerType; name?: string; blend?: Blend; color?: Layer['color']; text?: string; p?: ParamPatch
}
export const makeLayer = (s: LayerSpec): Layer => ({
  id: newId(),
  type: s.type,
  name: s.name ?? LAYER_INFO[s.type].label,
  visible: true,
  blend: s.blend ?? 'add',
  color: s.color ?? { mode: 'iris', hex: '#3bff03' },
  text: s.text ?? 'RICO',
  p: makeParams(defsFor(s.type), s.p),
})
export const makeFx = (patch: ParamPatch = {}) => makeParams(FX_DEFS, patch)

export interface Preset { name: string; layers: LayerSpec[]; fx: ParamPatch }
const r = (src: number, mult: number, base?: number): Partial<Param> => ({ src, mult, ...(base !== undefined ? { base } : {}) })

export const PRESETS: Preset[] = [
  {
    name: 'ECLIPSE',
    layers: [
      { type: 'ring', name: 'Corona', p: { radius: r(S.KICK, 0.12, 0.27), thickness: 26, warp: r(S.SNARE, 0.4, 0.2), glow: r(S.SUB, 0.3, 0.7), spin: 0.25 } },
      { type: 'ring', name: 'Halo', p: { radius: 0.34, thickness: 2, warp: 0.05, spin: -0.4, glow: 0.2, opacity: 0.7 } },
      { type: 'particles', name: 'Sparks', p: { rate: r(S.ONSET, 1, 20), speed: 0.3, size: 2.5, life: 1.4 } },
    ],
    fx: { trails: 0.72, zoom: 0.01, hueSpeed: r(S.PRES, 0.4, 0.06) },
  },
  {
    name: 'BLOOM',
    layers: [
      { type: 'rays', name: 'Petals', p: { count: 170, length: r(S.KICK, 0.25, 0.3), bend: r(S.MID, 0.4, 0.7), spin: r(S.LFO, 0.15, 0.1), thickness: 1.3 } },
      { type: 'ring', name: 'Core', p: { radius: r(S.KICK, 0.05, 0.05), thickness: 10, glow: 1, spin: 0.6 } },
    ],
    fx: { trails: 0.78, hueSpeed: 0.1 },
  },
  {
    name: 'PRISM',
    layers: [
      { type: 'polygon', name: 'Crystal', p: { sides: 6, copies: 9, radius: r(S.KICK, 0.15, 0.32), spin: r(S.LFO, 0.2, 0.2), twist: 0.3, thickness: 2.2 } },
      { type: 'dots', name: 'Grain', p: { spacing: 26, size: r(S.AIR, 0.6, 0.25), wave: 0.5, opacity: 0.5 } },
    ],
    fx: { kaleido: 8, trails: 0.5, glitch: r(S.ONSET, 0.6), hueSpeed: 0.06 },
  },
  {
    name: 'SIGNAL',
    layers: [
      { type: 'waves', name: 'Scope', p: { lines: 22, amplitude: r(S.SUB, 0.25, 0.08), audio: 0.8, speed: 1.4, spread: 0.8 } },
      { type: 'text', name: 'Title', text: 'RICO', blend: 'normal', color: { mode: 'solid', hex: '#ffffff' }, p: { size: r(S.KICK, 0.03, 0.12), jitter: r(S.ONSET, 0.3, 0) } },
    ],
    fx: { trails: 0.45, glitch: r(S.ONSET, 0.8), hueSpeed: 0.05 },
  },
  {
    name: 'SKETCH',
    layers: [
      { type: 'draw', name: 'My drawing', p: { thickness: r(S.KICK, 0.15, 3), echoes: 6, wobble: r(S.SNARE, 0.3, 0.008), spin: 0.25 } },
    ],
    fx: { trails: 0.65, hueSpeed: 0.08 },
  },
  { name: 'BLANK', layers: [], fx: { trails: 0.6 } },
]
