import { format, parseISO } from "date-fns"
import { calvingStatusBadgeClassAndLabel } from "@/lib/calvingStatus"
import type { Cattle } from "@/types/cattle"

/** Secondary calving status (e.g. "Calving soon · Due Jun 6, 2026") shown under the identity row in the log flow. */
export function CattleCalvingStatusRow({ cattle }: { cattle: Cattle }) {
  const badge = calvingStatusBadgeClassAndLabel(cattle)
  if (!badge) return null
  const due = cattle.dueDate ? `Due ${format(parseISO(cattle.dueDate), "MMM d, yyyy")}` : null
  return (
    <div className="flex flex-wrap items-center gap-2">
      <span className={badge.className}>{badge.label}</span>
      {due ? <span className="text-[13px] text-muted-foreground">{due}</span> : null}
    </div>
  )
}
