import { useCallback, useEffect, useRef, useState } from "react"

/**
 * Tracks whether a scroll container has been scrolled (scrollTop > 0).
 * Pair `scrollRef` with the overflow scroller and set `data-scrolled="true"` on the header
 * when `isScrolled` is true (use class `scroll-shadow-header` from global CSS).
 */
export function useScrollShadow() {
  const [isScrolled, setIsScrolled] = useState(false)
  const cleanupRef = useRef<(() => void) | null>(null)

  const scrollRef = useCallback((node: HTMLElement | null) => {
    cleanupRef.current?.()
    cleanupRef.current = null
    if (!node) {
      setIsScrolled(false)
      return
    }
    const update = () => setIsScrolled(node.scrollTop > 0)
    update()
    node.addEventListener("scroll", update, { passive: true })
    cleanupRef.current = () => node.removeEventListener("scroll", update)
  }, [])

  useEffect(() => () => cleanupRef.current?.(), [])

  return { scrollRef, isScrolled }
}
