import { about, links, media } from '../data/site'
import Section from './Section'
import Window from './Window'
import YouTubeClip from './YouTubeClip'

export default function About() {
  return (
    <Section id="about" index="05" title={about.title}>
      <div className="about-grid">
        <div className="about-copy">
          <p className="byline">
            Designed and built by{' '}
            <a className="name-link" href={links.maya}>
              <span className="prompt-sign">&gt;&gt;</span> MAYA KHALIL <span className="prompt-sign">&lt;&lt;</span>
            </a>
          </p>
          {about.paragraphs.map((p) => <p key={p}>{p}</p>)}

          <aside className="note">
            <p className="note-label">// from the user test</p>
            <p>{about.userTest}</p>
            <p className="note-source">
              Source: <a href={links.paper}>RICO: Real-time Integration Control Operations</a>, Maya Khalil, EVA London 2026.
            </p>
          </aside>
        </div>

        <Window title="USER_TEST.MP4" caption="A musician tries RICO for the first time" className="user-test">
          <YouTubeClip {...media.userTest} />
        </Window>
      </div>
    </Section>
  )
}
