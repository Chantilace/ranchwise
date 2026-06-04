import { useEffect, type MutableRefObject } from "react"

/** Smooth-scrolls a container to the bottom when the log observation phase
 *  transitions to "result", bringing the success banner and AI output into view. */
export function useResultPhaseScroll(
  phase: string,
  scrollRef: MutableRefObject<HTMLElement | null>
) {
  useEffect(() => {
    if (phase !== "result") return
    const el = scrollRef.current
    if (!el) return
    const raf = requestAnimationFrame(() => {
      el.scrollTo({ top: el.scrollHeight, behavior: "smooth" })
    })
    return () => cancelAnimationFrame(raf)
  }, [phase, scrollRef])
}
