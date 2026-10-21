import { useSyncExternalStore } from 'react'
import { cursorStyle as defaultCursor, heroBackground as defaultBackground } from './data/site'


export type CursorStyle = 'trail' | 'gcode' | 'piano' | 'wave' | 'pixel' | 'osc' | 'led'
export type HeroBackground = 'field' | 'bands' | 'prisms' | 'warp' | 'sdf'

export type WarpColor = 'mono' | 'iridescent'

export const CURSOR_OPTIONS: { id: CursorStyle; label: string }[] = [
  { id: 'trail', label: '0101' },
  { id: 'pixel', label: 'Pixel sort' },
  { id: 'osc', label: 'OSC' },
  { id: 'led', label: 'LED matrix' },
  { id: 'gcode', label: 'G-code' },
  { id: 'piano', label: 'Piano roll' },
  { id: 'wave', label: 'Signal' },
]
export const BG_OPTIONS: { id: HeroBackground; label: string }[] = [
  { id: 'field', label: 'Field' },
  { id: 'bands', label: 'Bands' },
  { id: 'prisms', label: 'Prisms' },
  { id: 'warp', label: 'Warp' },
  { id: 'sdf', label: 'SDF' },
]

export const WARP_OPTIONS: { id: WarpColor; label: string }[] = [
  { id: 'mono', label: 'B&W' },
  { id: 'iridescent', label: 'Iridescent' },
]

interface Prefs { cursor: CursorStyle; background: HeroBackground; warpColor: WarpColor }
const KEYS: Record<keyof Prefs, string> = { cursor: 'rico-cursor', background: 'rico-bg', warpColor: 'rico-warp' }

function read<T extends string>(key: string, allowed: string[], fallback: T): T {
  try {
    const v = localStorage.getItem(key)
    return v && allowed.includes(v) ? (v as T) : fallback
  } catch { return fallback }
}

let state: Prefs = {
  cursor: read('rico-cursor', CURSOR_OPTIONS.map((o) => o.id), defaultCursor),
  background: read('rico-bg', BG_OPTIONS.map((o) => o.id), defaultBackground),
  warpColor: read('rico-warp', WARP_OPTIONS.map((o) => o.id), 'mono'),
}
const listeners = new Set<() => void>()

export function setPref<K extends keyof Prefs>(key: K, value: Prefs[K]) {
  state = { ...state, [key]: value }
  try { localStorage.setItem(KEYS[key], value) } catch { /* ignore */ }
  listeners.forEach((l) => l())
}

export function usePrefs(): Prefs {
  return useSyncExternalStore(
    (cb) => { listeners.add(cb); return () => listeners.delete(cb) },
    () => state,
  )
}

export interface FieldColors { a: string; b: string; c: string; bright: number }
export const DEFAULT_COLORS: Record<'sdf' | 'warp', FieldColors> = {
  sdf: { a: '#ffffff', b: '#3bff03', c: '#ffffff', bright: 1 },
  warp: { a: '#ffffff', b: '#ffffff', c: '#ffffff', bright: 0.6 },
}
let colors: Record<'sdf' | 'warp', FieldColors> = (() => {
  try {
    const v = JSON.parse(localStorage.getItem('rico-colors') ?? 'null')
    if (v && v.sdf && v.warp) return { sdf: { ...DEFAULT_COLORS.sdf, ...v.sdf }, warp: { ...DEFAULT_COLORS.warp, ...v.warp } }
  } catch { /* ignore */ }
  return DEFAULT_COLORS
})()
const colorListeners = new Set<() => void>()
export function setColors(mode: 'sdf' | 'warp', patch: Partial<FieldColors> | null) {
  colors = { ...colors, [mode]: patch ? { ...colors[mode], ...patch } : DEFAULT_COLORS[mode] }
  try { localStorage.setItem('rico-colors', JSON.stringify(colors)) } catch { /* ignore */ }
  colorListeners.forEach((l) => l())
}
export function useColors() {
  return useSyncExternalStore(
    (cb) => { colorListeners.add(cb); return () => colorListeners.delete(cb) },
    () => colors,
  )
}
