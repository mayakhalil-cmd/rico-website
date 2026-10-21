import { steps } from '../data/site'
import Section from './Section'

export default function HowItWorks() {
  return (
    <Section id="how-it-works" index="04" title="How it works" intro="Three steps from plugging in to performing.">
      <ol className="steps">
        {steps.map((s) => (
          <li key={s.n} className="step">
            <span className="step-n" aria-hidden="true">{s.n}</span>
            <h3>{s.title}</h3>
            <p>{s.body}</p>
          </li>
        ))}
      </ol>
    </Section>
  )
}
