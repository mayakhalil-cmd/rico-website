import { useRef, useState } from 'react'
import type { KeyboardEvent } from 'react'
import { features } from '../data/site'
import Section from './Section'
import Window from './Window'


export default function Features() {
  const [active, setActive] = useState(0)
  const tabRefs = useRef<(HTMLButtonElement | null)[]>([])
  const f = features[active]

  const focusTab = (i: number) => {
    const next = (i + features.length) % features.length
    setActive(next)
    tabRefs.current[next]?.focus()
  }
  const onKeyDown = (e: KeyboardEvent<HTMLButtonElement>) => {
    if (e.key === 'ArrowDown' || e.key === 'ArrowRight') { e.preventDefault(); focusTab(active + 1) }
    if (e.key === 'ArrowUp' || e.key === 'ArrowLeft') { e.preventDefault(); focusTab(active - 1) }
    if (e.key === 'Home') { e.preventDefault(); focusTab(0) }
    if (e.key === 'End') { e.preventDefault(); focusTab(features.length - 1) }
  }

  return (
    <Section
      id="features"
      index="02"
      title="What RICO connects"
      intro="Each part of RICO handles one kind of signal. Pick one to see what it’s good for in a real setup."
    >
      <Window title="RICO_FEATURES.LOG" status={`${features.length} modules`}>
        <div className="features">
          <div className="feature-tabs" role="tablist" aria-label="Features" aria-orientation="vertical">
            {features.map((item, i) => (
              <button
                key={item.id}
                ref={(el) => { tabRefs.current[i] = el }}
                role="tab"
                id={`tab-${item.id}`}
                aria-selected={i === active}
                aria-controls={`panel-${item.id}`}
                tabIndex={i === active ? 0 : -1}
                className="feature-tab"
                onClick={() => setActive(i)}
                onKeyDown={onKeyDown}
              >
                <span className="tab-marker" aria-hidden="true">{i === active ? '>' : ' '}</span>
                {item.tab}
                {item.status === 'in-progress' && <span className="tag tag-wip">wip</span>}
              </button>
            ))}
          </div>

          <div className="feature-panel" role="tabpanel" id={`panel-${f.id}`} aria-labelledby={`tab-${f.id}`} key={f.id}>
            <div className="feature-head">
              <h3>{f.title}</h3>
              <span className={`tag ${f.status === 'available' ? 'tag-ok' : 'tag-wip'}`}>
                {f.status === 'available' ? 'available' : 'in progress'}
              </span>
            </div>
            <p className="feature-summary">{f.summary}</p>
            <p className="feature-uses-label">// use it to</p>
            <ul className="feature-uses">
              {f.uses.map((u) => <li key={u}>{u}</li>)}
            </ul>
          </div>
        </div>
      </Window>

      <ul className="feature-index" aria-label="All features">
        {features.map((item) => (
          <li key={item.id}>
            <span className={item.status === 'available' ? 'dot dot-ok' : 'dot dot-wip'} aria-hidden="true" />
            {item.title}
            {item.status === 'in-progress' && <span className="sr-only"> (in progress)</span>}
          </li>
        ))}
      </ul>
    </Section>
  )
}
