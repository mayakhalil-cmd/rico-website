import { useRef, useState } from 'react'
import { labAudio, useAudioMode } from '../lab/audio'


const fmt = (v: number, d = 2) => v.toFixed(d)

export default function AudioControls({ compact = false, sources = true }: { compact?: boolean; sources?: boolean }) {
  const { mode, settings, fileName } = useAudioMode()
  const input = useRef<HTMLInputElement | null>(null)
  const [error, setError] = useState('')

  const pickFile = async (f: File | undefined) => {
    if (!f) return
    setError('')
    try { await labAudio.startFile(f) } catch { setError('That file could not be played. Try an MP3, WAV or M4A.') }
  }
  const mic = async () => {
    setError('')
    try { await labAudio.startMic() } catch { setError('Microphone not available or permission was declined.') }
  }
  const demo = () => { setError(''); labAudio.startDemo(); labAudio.setHear(true) }

  return (
    <div className={compact ? 'audio-ctl compact' : 'audio-ctl'}>
      {sources && <div className="audio-src" role="group" aria-label="Sound source">
        <span className="picker-label">SOURCE</span>
        <button className={mode === 'demo' ? 'picker-opt on' : 'picker-opt'} onClick={demo}>Demo beat</button>
        <button className={mode === 'file' ? 'picker-opt on' : 'picker-opt'} onClick={() => input.current?.click()}>
          {mode === 'file' ? 'Change track' : 'My music'}
        </button>
        <button className={mode === 'mic' ? 'picker-opt on' : 'picker-opt'} onClick={mic}>Mic</button>
        {mode !== 'off' && <button className="picker-opt" onClick={() => labAudio.stop()}>Stop</button>}
        <input ref={input} type="file" accept="audio/*" hidden onChange={(e) => { pickFile(e.target.files?.[0]); e.target.value = '' }} />
      </div>}
      {sources && mode === 'file' && <p className="audio-file">▶ {fileName}</p>}
      {error && <p className="audio-err" role="alert">{error}</p>}

      <div className="audio-sliders">
        <label>
          <span>LFO speed <b>{fmt(settings.lfoHz)} Hz</b></span>
          <input type="range" min="0.05" max="4" step="0.05" value={settings.lfoHz} onChange={(e) => labAudio.set({ lfoHz: +e.target.value })} />
        </label>
        <label>
          <span>Reactivity <b>{fmt(settings.gain, 1)}×</b></span>
          <input type="range" min="0.3" max="2.5" step="0.1" value={settings.gain} onChange={(e) => labAudio.set({ gain: +e.target.value })} />
        </label>
        <label>
          <span>Smoothing <b>{Math.round(settings.smooth * 100)}%</b></span>
          <input type="range" min="0" max="0.9" step="0.05" value={settings.smooth} onChange={(e) => labAudio.set({ smooth: +e.target.value })} />
        </label>
      </div>
    </div>
  )
}
