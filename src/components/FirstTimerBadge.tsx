import { Sprout } from "lucide-react"

/** First-timers pasture tag — Figma 46:1254 (sprout icon + neutral badge). */
export function FirstTimerBadge() {
  return (
    <span className="inline-flex items-center gap-1 rounded-lg border border-neutral-200 bg-neutral-100 px-2 py-0.5 text-xs font-medium text-foreground">
      <Sprout className="size-3 shrink-0" aria-hidden />
      First Timers
    </span>
  )
}
