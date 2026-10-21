const ITEMS = [
  'MIDI', 'OSC', 'SPOUT', 'NDI', 'DMX / ART-NET', 'MQTT', 'SERIAL', 'AUDIO FFT',
  'GUITAR → MIDI', 'VIRTUAL MIDI PORTS',
]

export default function Marquee() {
  const row = (
    <div className="marquee-row">
      {ITEMS.map((item) => (
        <span key={item} className="marquee-item">
          {item}<span className="marquee-sep">✳</span>
        </span>
      ))}
    </div>
  )
  return (
    <div className="marquee" aria-label={`Signals: ${ITEMS.join(', ')}`} role="img">
      <div className="marquee-track" aria-hidden="true">
        {row}
        {row}
      </div>
    </div>
  )
}
