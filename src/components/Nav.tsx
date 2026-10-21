import { useState } from 'react'
import { links } from '../data/site'
import Logo from './Logo'

const items = [
  { label: 'Features', href: '#features' },
  { label: 'Lab', href: '#lab' },
  { label: 'How it works', href: '#how-it-works' },
  { label: 'Work', href: '#work' },
  { label: 'About', href: '#about' },
]

export default function Nav() {
  const [open, setOpen] = useState(false)

  return (
    <header className="nav">
      <div className="wrap nav-inner">
        <a className="nav-logo" href="#top" aria-label="RICO, back to top">
          <Logo size="nav" />
        </a>

        <button
          className="nav-toggle"
          aria-expanded={open}
          aria-controls="nav-links"
          onClick={() => setOpen((v) => !v)}
        >
          {open ? '[close]' : '[menu]'}
        </button>

        <nav id="nav-links" className={open ? 'nav-links open' : 'nav-links'} aria-label="Main">
          {items.map((item) => (
            <a key={item.href} href={item.href} onClick={() => setOpen(false)}>
              {item.label}
            </a>
          ))}
          <a className="nav-cta" href="#download" onClick={() => setOpen(false)}>Download</a>
          <a className="nav-gh" href={links.github} aria-label="RICO on GitHub">GH↗</a>
        </nav>
      </div>
    </header>
  )
}
