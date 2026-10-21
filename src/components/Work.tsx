import { links, media, phantom } from '../data/site'
import MediaSlot from './MediaSlot'
import PhantomFlow from './PhantomFlow'
import Section from './Section'
import Window from './Window'
import YouTubeClip from './YouTubeClip'

export default function Work() {
  return (
    <Section
      id="work"
      index="06"
      title="Built through making"
      intro="RICO grew out of real installations. Here is the tool itself, the work it drives, and how it was built."
    >
      {/* the tool: no frame, the video already has one */}
      <div className="work-wide">
        <YouTubeClip {...media.interfaceLoop} />
      </div>

      {/* Phantom Performer */}
      <div className="phantom">
        <div className="phantom-copy">
          <p className="kicker">installation · driven by RICO</p>
          <h3 className="phantom-title">{phantom.title}</h3>
          <p className="phantom-where">{phantom.where}</p>
          <p>{phantom.body}</p>
        </div>
        <PhantomFlow />
      </div>

      <Window title="PHANTOM_PERFORMER.MP4" caption="Phantom Performer running, all three systems driven by RICO" className="work-wide">
        <YouTubeClip {...media.installationLoop} />
      </Window>

      {/* the hybrid After Effects plugin */}
      <div className="split">
        <Window title="FRETBOARD.MP4" caption="Hybrid After Effects plugin: audio-reactive visuals mapped onto my guitar fretboard">
          <YouTubeClip {...media.fretboard} />
        </Window>
        <div className="split-copy">
          <p className="kicker">after effects · hybrid plugin</p>
          <h3 className="split-title">Play it live. Finish it in After Effects.</h3>
          <ol className="how-list">
            <li><b>01</b><span>I play guitar. RICO listens in real time, splitting the sound into frequency bands and turning the notes into MIDI.</span></li>
            <li><b>02</b><span>RICO records the take and hands the audio and MIDI values to After Effects as keyframes, so the motion follows exactly what was played.</span></li>
            <li><b>03</b><span>In After Effects, those keyframes drive audio-reactive visuals that are mapped onto the guitar fretboard.</span></li>
          </ol>
          {links.aePlugin
            ? <a className="btn" href={links.aePlugin}>Get the After Effects plugin</a>
            : <p className="split-try">The plugin link is coming soon. Until then, try the same idea in <a href="#lab">03 Signal Lab</a>: build a visual and drive it with sound.</p>}
        </div>
      </div>


      {/* two stills, so fewer things play at once */}
      <div className="photo-pair">
        <Window title="PHANTOM_PERFORMER.JPG" caption="The installation: projection, volumetric display and LEDs">
          <MediaSlot file={media.phantomPhoto} ratio="16/9"
            alt="Phantom Performer: projection-mapped spheres on the wall, a laptop running RICO, and a glowing volumetric display on a round projection-mapped table"
            placeholder="Phantom Performer" />
        </Window>
        <Window title="PROJECTION.JPG" caption="Projection-mapped spheres">
          <MediaSlot file={media.phantomSpheres} ratio="16/9"
            alt="Close-up of projection-mapped spheres with glowing contour stripes in green, blue, white and red"
            placeholder="Projection close-up" />
        </Window>
      </div>
    </Section>
  )
}
