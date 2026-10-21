import { setColors, useColors } from '../prefs'

const LABELS = {
  sdf: { a: 'Blob', b: 'Outline', c: 'Field lines', bright: 'Field brightness' },
  warp: { a: 'Shape', b: 'Edge', c: 'Background lines', bright: 'Background brightness' },
}

export default function ColorControls({ mode, iridescent = false }: { mode: 'sdf' | 'warp'; iridescent?: boolean }) {
  const c = useColors()[mode], L = LABELS[mode]
  return (
    <div className="color-ctl" role="group" aria-label="Colours">
      <span className="picker-label">COLOURS</span>
      {(['a', 'b', 'c'] as const).map((k) => (
        <label key={k} className={k === 'a' && iridescent ? 'color-swatch off' : 'color-swatch'} title={k === 'a' && iridescent ? 'Iridescent mode colours the shapes itself' : undefined}>
          <input type="color" value={c[k]} disabled={k === 'a' && iridescent} onChange={(e) => setColors(mode, { [k]: e.target.value })} />
          <span>{L[k]}</span>
        </label>
      ))}
      <label className="color-bright">
        <span>{L.bright} <b>{Math.round(c.bright * 100)}%</b></span>
        <input type="range" min="0" max="2" step="0.05" value={c.bright} onChange={(e) => setColors(mode, { bright: +e.target.value })} />
      </label>
      <button className="picker-opt" onClick={() => setColors(mode, null)}>Reset</button>
    </div>
  )
}
