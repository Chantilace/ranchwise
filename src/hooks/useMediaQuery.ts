import { useEffect, useState } from "react"

/**
 * Media query hook with Safari-compatible subscription.
 * - Initializes from current `matchMedia().matches`
 * - Updates live on viewport changes
 */
export function useMediaQuery(query: string): boolean {
  const [matches, setMatches] = useState(() => {
    if (typeof window === "undefined") return false
    return window.matchMedia(query).matches
  })

  useEffect(() => {
    const media = window.matchMedia(query)

    // Sync in case the initial render happened at a different width.
    if (media.matches !== matches) setMatches(media.matches)

    const handler = (e: MediaQueryListEvent) => setMatches(e.matches)

    // Safari < 14 uses addListener/removeListener.
    if (typeof media.addEventListener === "function") {
      media.addEventListener("change", handler)
      return () => media.removeEventListener("change", handler)
    }

    // eslint-disable-next-line deprecation/deprecation
    media.addListener(handler)
    // eslint-disable-next-line deprecation/deprecation
    return () => media.removeListener(handler)
  }, [query, matches])

  return matches
}
