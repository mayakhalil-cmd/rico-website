import { useSyncExternalStore } from 'react'

export interface LogEntry { id: number; ts: string; tag: string; text: string; to?: string }

export function createLogStore(max = 160) {
  let items: LogEntry[] = []
  let id = 0
  const subs = new Set<() => void>()
  return {
    push(tag: string, text: string, to?: string) {
      id++
      const ts = new Date().toLocaleTimeString([], { hour12: false })
      items = [...items, { id, ts, tag, text, to }].slice(-max)
      subs.forEach((f) => f())
    },
    subscribe(f: () => void) { subs.add(f); return () => { subs.delete(f) } },
    get: () => items,
  }
}
export type LogStore = ReturnType<typeof createLogStore>

export const useLog = (store: LogStore) => useSyncExternalStore(store.subscribe, store.get)
