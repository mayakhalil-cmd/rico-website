import { useMemo } from 'react'
import ScrollLog from '../components/ScrollLog'
import type { LogLine } from '../components/ScrollLog'
import { useLog } from './logStore'
import type { LogStore } from './logStore'

export default function LabLog({ store, height = '12.5em' }: { store: LogStore; height?: string }) {
  const items = useLog(store)
  const lines: LogLine[] = useMemo(
    () => items.map((e) => ({
      id: e.id,
      content: (
        <span className="code-line">
          <span className="tx-ts">{e.ts}</span>
          <b className={`tx-tag t-${e.tag.toLowerCase()}`}>{e.tag}</b>
          <span>{e.text}</span>
          {e.to && <i className="code-dest">→ {e.to}</i>}
        </span>
      ),
    })),
    [items],
  )
  return <ScrollLog lines={lines} height={height} empty="waiting…" label="Messages the Signal Lab would send" />
}
