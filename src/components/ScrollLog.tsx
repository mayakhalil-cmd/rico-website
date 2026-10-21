import { useEffect, useLayoutEffect, useRef, useState } from 'react'
import type { ReactNode } from 'react'

export interface LogLine {
  id: number
  content: ReactNode
}

interface Props {
  lines: LogLine[]
  height?: string 
  empty?: string 
  label: string 
}

export default function ScrollLog({ lines, height = '15.5em', empty = 'waiting…', label }: Props) {
  const boxRef = useRef<HTMLDivElement | null>(null)
  const [follow, setFollow] = useState(true)
  const [unread, setUnread] = useState(0)
  const lastId = useRef(0)

  useLayoutEffect(() => {
    const box = boxRef.current
    if (!box) return
    const newest = lines.length > 0 ? lines[lines.length - 1].id : 0
    const added = newest - lastId.current
    lastId.current = newest
    if (follow) box.scrollTop = box.scrollHeight
    else if (added > 0) setUnread((u) => u + added)
  }, [lines, follow])

  const onScroll = () => {
    const box = boxRef.current
    if (!box) return
    const atBottom = box.scrollHeight - box.scrollTop - box.clientHeight < 24
    setFollow(atBottom)
    if (atBottom) setUnread(0)
  }

  const jump = () => {
    const box = boxRef.current
    if (!box) return
    box.scrollTop = box.scrollHeight
    setFollow(true)
    setUnread(0)
  }

  useEffect(() => { if (lines.length === 0) setUnread(0) }, [lines.length])

  return (
    <div className="scrolllog">
      <div ref={boxRef} className="scrolllog-box" style={{ height }} onScroll={onScroll} tabIndex={0} role="log" aria-label={label} aria-live="off">
        {lines.length === 0 ? (
          <p className="scrolllog-empty">{empty}<span className="cursor" /></p>
        ) : (
          <ol className="scrolllog-list">
            {lines.map((l) => <li key={l.id}>{l.content}</li>)}
          </ol>
        )}
      </div>
      {!follow && (
        <button className="scrolllog-jump" onClick={jump}>
          ↓ {unread > 0 ? `${unread} new` : 'latest'}
        </button>
      )}
    </div>
  )
}
