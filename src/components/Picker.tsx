interface Option<T extends string> { id: T; label: string }

interface Props<T extends string> {
  label: string
  options: Option<T>[]
  value: T
  onChange: (v: T) => void
}

export default function Picker<T extends string>({ label, options, value, onChange }: Props<T>) {
  return (
    <div className="picker" role="radiogroup" aria-label={label}>
      <span className="picker-label">{label}</span>
      {options.map((o) => (
        <button
          key={o.id}
          role="radio"
          aria-checked={o.id === value}
          className={o.id === value ? 'picker-opt on' : 'picker-opt'}
          onClick={() => onChange(o.id)}
        >
          {o.label}
        </button>
      ))}
    </div>
  )
}
