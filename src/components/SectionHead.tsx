import type { ReactNode } from 'react'

interface Props {
  id: string
  index: string
  label: string
  title: string
  children?: ReactNode
}

export default function SectionHead({ id, index, label, title, children }: Props) {
  return (
    <header className="section__head">
      <p className="section__index">
        {index} / {label}
      </p>
      <h2 id={id}>{title}</h2>
      {children && <p className="lede">{children}</p>}
    </header>
  )
}