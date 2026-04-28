import { useMemo } from "react"

import { ObservationTimelineEntryCard } from "@/components/ObservationTimelineEntryCard"
import { parseObservationDate } from "@/lib/initialObservations"
import { computeLatestObservationEntryIdsByCategory } from "@/lib/observationTimelineDisplay"
import type { ObservationEntry } from "@/types/observation"
import { cn } from "@/lib/utils"

function sortObservationsNewestFirst(entries: ObservationEntry[]): ObservationEntry[] {
  return [...entries].sort((a, b) => parseObservationDate(b.date) - parseObservationDate(a.date))
}

export type ObservationTimelineProps = {
  observations: ObservationEntry[]
  /**
   * Full list for “latest per category” status styling when `observations` is filtered.
   * Defaults to `observations`.
   */
  observationsUnfilteredForCategoryLatest?: ObservationEntry[]
  /** Applied to title, empty state, and list (e.g. `px-4` in side panel). */
  contentClassName?: string
}

/**
 * Newest-first observation list — body, optional inline AI panel, metadata; sparkle when `aiResult` exists.
 */
export function ObservationTimeline({
  observations,
  observationsUnfilteredForCategoryLatest,
  contentClassName,
}: ObservationTimelineProps) {
  const sourceForLatest = observationsUnfilteredForCategoryLatest ?? observations
  const latestByCategoryIds = useMemo(
    () => computeLatestObservationEntryIdsByCategory(sourceForLatest),
    [sourceForLatest],
  )

  const timeline = useMemo(() => sortObservationsNewestFirst(observations), [observations])
  const pad = contentClassName

  return (
    <div>
      <p
        className={cn(
          "text-[13px] font-medium tracking-[0.08em] text-muted-foreground uppercase opacity-70",
          pad,
        )}
      >
        Observation timeline
      </p>

      {timeline.length === 0 ? (
        <p className={cn("mt-3 text-sm text-muted-foreground", pad)}>No observations yet.</p>
      ) : (
        <ul className={cn("mt-3 flex flex-col gap-2", pad)}>
          {timeline.map((entry) => (
            <ObservationTimelineEntryCard
              key={entry.id}
              entry={entry}
              isLatestOfCategory={latestByCategoryIds.has(entry.id)}
            />
          ))}
        </ul>
      )}
    </div>
  )
}
