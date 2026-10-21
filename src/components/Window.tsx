import type { ReactNode } from 'react'

interface WindowProps {
  title: string 
  status?: string 
  caption?: string 
  children: ReactNode
  className?: string
}

export default function Window({ title, status, caption, children, className = '' }: WindowProps) {
  return (
    <figure className={`frame ${className}`}>
      <div className="frame-top">
        <span className="frame-tab">{title}</span>
        {status && <span className="frame-status">{status}</span>}
      </div>
      <div className="frame-body">{children}</div>
      {caption && <figcaption className="frame-caption">{caption}</figcaption>}
    </figure>
  )
}
