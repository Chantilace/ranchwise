import { useSyncExternalStore } from "react"

function subscribe(query: string, onStoreChange: () => void) {
  const media = window.matchMedia(query)
  media.addEventListener("change", onStoreChange)
  return () => media.removeEventListener("change", onStoreChange)
}

export function useMediaQuery(query: string): boolean {
  return useSyncExternalStore(
    (onStoreChange) => subscribe(query, onStoreChange),
    () => window.matchMedia(query).matches,
    () => false
  )
}
