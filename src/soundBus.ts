type Listener = (owner: string) => void
const listeners = new Set<Listener>()

export const claimSound = (owner: string) => listeners.forEach((l) => l(owner))
export const onSoundClaim = (l: Listener) => {
  listeners.add(l)
  return () => { listeners.delete(l) }
}
