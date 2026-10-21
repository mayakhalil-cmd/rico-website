export default function SoundButton({ muted, onToggle, label }: { muted: boolean; onToggle: () => void; label: string }) {
  return (
    <button
      className={muted ? 'vid-sound' : 'vid-sound on'}
      onClick={onToggle}
      aria-pressed={!muted}
      aria-label={muted ? `Turn sound on: ${label}` : `Turn sound off: ${label}`}
    >
      {muted ? '♪ sound off' : '♪ sound on'}
    </button>
  )
}
