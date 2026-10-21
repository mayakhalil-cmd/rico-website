import { links } from '../data/site'
import BrandTag from './BrandTag'
import Logo from './Logo'

export default function Footer() {
  return (
    <footer className="footer">
      <div className="wrap">
        <div className="footer-mark">
          <Logo size="footer" underscore={false} />
          <p className="footer-tagline">Real-time Integration Control Operations</p>
        </div>
        <div className="footer-inner">
          <BrandTag />
          <nav aria-label="Footer">
            <a href={links.github}>GitHub</a>
            <a href={links.releases}>Releases</a>
            <a href={links.paper}>EVA 2026 paper</a>
          </nav>
          <p className="small footer-name">
            <span className="prompt-sign">&gt;&gt;</span>{' '}
            <a className="name-link" href={links.maya}>MAYA KHALIL</a>{' '}
            <span className="prompt-sign">&lt;&lt;</span> · © {new Date().getFullYear()} · All rights reserved
          </p>
        </div>
      </div>
    </footer>
  )
}
