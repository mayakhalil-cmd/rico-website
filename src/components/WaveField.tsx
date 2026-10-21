const RINGS = Array.from({ length: 36 }, (_, i) => 12 + i * 16)

export default function WaveField() {
  return (
    <svg
      className="wavefield"
      viewBox="0 0 800 560"
      preserveAspectRatio="xMidYMid slice"
      aria-hidden="true"
      focusable="false"
    >
      <g className="wave-a">
        <g transform="translate(470 250)">
          {RINGS.map((r) => (
            <circle key={r} r={r} />
          ))}
        </g>
      </g>
      <g className="wave-b">
        <g transform="translate(610 330)">
          {RINGS.map((r) => (
            <circle key={r} r={r} />
          ))}
        </g>
      </g>
    </svg>
  )
}