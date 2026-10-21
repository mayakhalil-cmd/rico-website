import { links, release, requirements } from '../data/site'
import Section from './Section'
import Window from './Window'

export default function Download() {
  return (
    <Section
      id="download"
      index="07"
      title="Download"
      intro={`RICO ${release.version} is a free public beta for Windows. ${release.note}`}
    >
      <div className="download-grid">
        <Window title="INSTALL.TXT" status={release.version}>
          <ol className="install">
            <li>
              <span className="install-n">1</span>
              <div>
                <p><strong>Install the two required runtimes first.</strong> RICO will not launch without them.</p>
                <ul>
                  <li><a href={links.ndiTools}>NDI Runtime</a> (included with NDI Tools), for NDI send and receive</li>
                  <li><a href={links.teVirtualMidi}>teVirtualMIDI</a>, for virtual MIDI ports</li>
                </ul>
                <p className="small">The exact download links are also in the release notes.</p>
              </div>
            </li>
            <li>
              <span className="install-n">2</span>
              <div>
                <p><strong>Download the installer</strong> <code>{release.installer}</code> from the GitHub release.</p>
              </div>
            </li>
            <li>
              <span className="install-n">3</span>
              <div>
                <p><strong>Run it and open RICO</strong> from the Start Menu or desktop shortcut.</p>
                <p className="small">
                  Windows SmartScreen may show a warning the first time because the app isn’t
                  code-signed yet. Click <em>More info</em>, then <em>Run anyway</em>.
                </p>
              </div>
            </li>
          </ol>
          <div className="cta-row">
            <a className="btn btn-primary" href={links.releases}>Get RICO {release.version}</a>
            <a className="btn" href={links.github}>View README</a>
          </div>
        </Window>

        <div>
          <h3 className="side-title">// system</h3>
          <dl className="specs">
            {requirements.map((r) => (
              <div key={r.key}><dt>{r.key}</dt><dd>{r.value}</dd></div>
            ))}
          </dl>
          <p className="small muted">RICO is in beta. If something breaks, please report it on GitHub.</p>
        </div>
      </div>
    </Section>
  )
}
