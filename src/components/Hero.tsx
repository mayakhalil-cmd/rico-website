import { useCallback, useState } from 'react'
import { links, release } from '../data/site'
import { labAudio, useAudioMode } from '../lab/audio'
import { useFinePointer } from '../hooks'
import { BG_OPTIONS, CURSOR_OPTIONS, WARP_OPTIONS, setPref, useColors, usePrefs } from '../prefs'
import ColorControls from './ColorControls'
import AsciiField from './AsciiField'
import AudioControls from './AudioControls'
import BrandTag from './BrandTag'
import HeroCanvas from './HeroCanvas'
import HeroGL from './HeroGL'
import Logo from './Logo'
import Picker from './Picker'
import ScrambleText from './ScrambleText'

const HINTS: Record<string, string> = {
  field: 'move / click to disturb the field',
  bands: 'each stream is a frequency band / play the beat to drive them / click to ripple',
  prisms: 'move to steer the prisms / click to burst and glitch',
  warp: 'move to bend the lines / click to make the sheen swirl',
  sdf: 'move to pull the blobs together / click to send a shockwave',
}

export default function Hero() {
  const { background, warpColor, cursor } = usePrefs()
  const fine = useFinePointer()
  const fieldColors = useColors()
  const { mode } = useAudioMode()
  const [glFailed, setGlFailed] = useState(false)
  const [menu, setMenu] = useState<'visuals' | 'cursor' | 'sound' | null>(null)
  const toggleMenu = (m: 'visuals' | 'cursor' | 'sound') => setMenu(menu === m ? null : m)
  const onFail = useCallback(() => setGlFailed(true), [])
  const gl = background === 'prisms' || background === 'warp' || background === 'sdf'

  const toggleSound = () => {
    if (mode === 'off') { labAudio.startDemo(); labAudio.setHear(true) }
    else labAudio.stop()
  }

  return (
    <section className="hero" id="top" aria-labelledby="hero-title">
      {background === 'field' || (gl && glFailed) ? <AsciiField />
        : gl ? <HeroGL mode={background as 'prisms' | 'warp' | 'sdf'} mono={warpColor === 'mono'} colors={background === 'sdf' ? fieldColors.sdf : fieldColors.warp} onFail={onFail} key={background} />
          : <HeroCanvas mode="bands" key={background} />}
      {/* CRT screen over every background (Prisms has its own, built into its shader) */}
      {(background !== 'prisms' || glFailed) && <div className="hero-crt" aria-hidden="true" />}
      <div className="hero-veil" aria-hidden="true" />

      <div className="wrap hero-inner">
        <h1 id="hero-title" className="hero-title">
          <Logo size="hero" />
          <ScrambleText className="hero-expansion" text="REAL-TIME INTEGRATION CONTROL OPERATIONS" delay={250} />
        </h1>

        <p className="lead">
          One lightweight hub that connects your creative apps, protocols and hardware. Route
          MIDI, OSC, video, lighting and audio between them in real time, without code or
          complicated patching.
        </p>

        <div className="cta-row">
          <a className="btn btn-primary" href={links.releases}>Download for Windows</a>
          <a className="btn" href="#features">See features</a>
        </div>

        <dl className="hero-meta">
          <div><dt>version</dt><dd>{release.version}</dd></div>
          <div><dt>status</dt><dd>{release.label.toLowerCase()}</dd></div>
          <div><dt>platform</dt><dd>windows 10/11 x64</dd></div>
          <div><dt>price</dt><dd>free</dd></div>
        </dl>
      </div>

      <div className="hero-foot wrap">
        <BrandTag />
        <div className="hero-center">
          <div className="hero-pickers">
            <button className={menu === 'visuals' ? 'picker-opt sound on' : 'picker-opt sound'} onClick={() => toggleMenu('visuals')} aria-expanded={menu === 'visuals'}>
              {menu === 'visuals' ? '✕ visuals' : '⚙ visuals'}
            </button>
            {fine && (
              <button className={menu === 'cursor' ? 'picker-opt sound on' : 'picker-opt sound'} onClick={() => toggleMenu('cursor')} aria-expanded={menu === 'cursor'}>
                {menu === 'cursor' ? '✕ cursor' : '⌖ cursor'}
              </button>
            )}
            <button className={mode !== 'off' ? 'picker-opt sound on' : 'picker-opt sound'} onClick={toggleSound} aria-pressed={mode !== 'off'}>
              {mode === 'off' ? '♪ play beat' : mode === 'mic' ? '♪ mic on' : mode === 'file' ? '♪ your track' : '♪ beat on'}
            </button>
            <button className={menu === 'sound' ? 'picker-opt sound on' : 'picker-opt sound'} onClick={() => toggleMenu('sound')} aria-expanded={menu === 'sound'}>
              {menu === 'sound' ? '✕ sound' : '≋ sound'}
            </button>
          </div>
          {/* an open menu takes the place of the hint line, below the buttons */}
          {menu ? (
            <div className="hero-menu">
              {menu === 'cursor' && <Picker label="CURSOR" options={CURSOR_OPTIONS} value={cursor} onChange={(v) => setPref('cursor', v)} />}
              {menu === 'visuals' && <Picker label="BG" options={BG_OPTIONS} value={background} onChange={(v) => { setGlFailed(false); setPref('background', v) }} />}
              {menu === 'visuals' && background === 'warp' && !glFailed && (
                <Picker label="LINES" options={WARP_OPTIONS} value={warpColor} onChange={(v) => setPref('warpColor', v)} />
              )}
              {menu === 'visuals' && (background === 'sdf' || background === 'warp') && !glFailed && (
                <ColorControls mode={background} iridescent={background === 'warp' && warpColor === 'iridescent'} />
              )}
              {menu === 'sound' && <AudioControls compact />}
            </div>
          ) : (
            <span className="hero-hint" aria-hidden="true">
              {HINTS[background]}{mode !== 'off' ? ' · reacting to sound' : ''}
            </span>
          )}
        </div>
        <span className="hero-scroll" aria-hidden="true">scroll ↓</span>
      </div>
    </section>
  )
}
