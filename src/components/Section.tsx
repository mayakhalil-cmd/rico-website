import type { ReactNode } from 'react'
import ScrambleText from './ScrambleText'

interface SectionProps {
  id?: string
  index: string 
  title: string
  intro?: ReactNode
  children: ReactNode
  className?: string
}

export default function Section({ id, index, title, intro, children, className = '' }: SectionProps) {
  const headingId = id ? `${id}-title` : undefined
  return (
    <section id={id} className={`section ${className}`} aria-labelledby={headingId}>
      <div className="wrap">
        <div className="section-head">
          <span className="section-index" aria-hidden="true">{index}</span>
        </div>
        <ScrambleText as="h2" id={headingId} text={title} />
        {intro && <p className="intro">{intro}</p>}
        {children}
      </div>
      <span className="corner-x" aria-hidden="true">✕</span>
    </section>
  )
}
