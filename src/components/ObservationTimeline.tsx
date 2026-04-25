import { useMemo, useState } from "react"

import { ObservationCategoryBadge } from "@/components/ObservationCategoryBadge"
import { AiSparkleDisclosureButton } from "@/components/ui/ai-sparkle-disclosure-button"
import { parseObservationDate } from "@/lib/initialObservations"
import { getObservationTimelineDotClass } from "@/lib/statusUtils"
import type { ObservationEntry, RiskLevel } from "@/types/observation"
import { cn } from "@/lib/utils"

function sortObservationsNewestFirst(entries: ObservationEntry[]): ObservationEntry[] {
  return [...entries].sort((a, b) => parseObservationDate(b.date) - parseObservationDate(a.date))
}

function observationRiskLevel(entry: ObservationEntry): RiskLevel | null {
  return entry.aiResult?.riskLevel ?? null
}

function observationAiSuggestionText(entry: ObservationEntry): string | null {
  const ai = entry.aiResult
  if (!ai) return null
  const note = ai.patternNote?.trim()
  if (note) return note
  const recs = ai.recommendations?.map((s) => s.trim()).filter(Boolean) ?? []
  if (recs.length) return recs.join(" ")
  return null
}

export type ObservationTimelineProps = {
  observations: ObservationEntry[]
  /** Applied to title, empty state, and list (e.g. `px-4` in side panel). */
  contentClassName?: string
}

/**
 * Newest-first observation list with optional AI snippet expand — matches cattle side panel.
 */
export function ObservationTimeline({ observations, contentClassName }: ObservationTimelineProps) {
  const [aiExpandedIds, setAiExpandedIds] = useState<Record<string, boolean>>({})

  const timeline = useMemo(() => sortObservationsNewestFirst(observations), [observations])
  const visibleExpandedIds = useMemo(() => {
    if (timeline.length === 0) return {}
    const next: Record<string, boolean> = {}
    for (const entry of timeline) {
      if (aiExpandedIds[entry.id]) next[entry.id] = true
    }
    return next
  }, [aiExpandedIds, timeline])
  const pad = contentClassName

  return (
    <div>
      <p
        className={cn(
          "text-xs font-medium tracking-[0.08em] text-muted-foreground uppercase opacity-70",
          pad
        )}
      >
        Observation timeline
      </p>

      {timeline.length === 0 ? (
        <p className={cn("mt-3 text-sm text-muted-foreground", pad)}>No observations yet.</p>
      ) : (
        <ul className={cn("mt-3 flex flex-col gap-2", pad)}>
          {timeline.map((entry) => {
            const level = observationRiskLevel(entry)
            const aiSuggestion = observationAiSuggestionText(entry)
            const expanded = Boolean(visibleExpandedIds[entry.id])
            return (
              <li key={entry.id} className="rounded-xl border border-border bg-background px-4 py-3 shadow-sm">
                <div className="mb-1.5 flex items-center justify-between gap-2">
                  <div className="flex min-w-0 flex-1 items-center gap-2.5">
                    <div
                      className={cn("h-2 w-2 shrink-0 rounded-full", getObservationTimelineDotClass(level))}
                      aria-hidden
                    />
                    <div className="flex min-w-0 flex-1 flex-wrap items-center gap-2 text-sm">
                      <span className="font-medium text-foreground">{entry.date}</span>
                      <ObservationCategoryBadge category={entry.category} />
                      <span className="text-muted-foreground">{entry.loggedBy}</span>
                    </div>
                  </div>
                  {aiSuggestion ? (
                    <AiSparkleDisclosureButton
                      ariaLabel={expanded ? "Hide AI suggestion" : "Show AI suggestion"}
                      expanded={expanded}
                      onClick={(e) => {
                        e.stopPropagation()
                        setAiExpandedIds((prev) => ({ ...prev, [entry.id]: !prev[entry.id] }))
                      }}
                    />
                  ) : null}
                </div>
                <p className="text-sm leading-relaxed text-foreground">{entry.notes}</p>
                {aiSuggestion ? (
                  <div
                    className={cn(
                      "overflow-hidden transition-all duration-300 ease-out",
                      expanded ? "mt-3 max-h-[500px] opacity-100" : "mt-0 max-h-0 opacity-0"
                    )}
                  >
                    <div className="rounded-lg bg-muted px-3 py-2 text-sm leading-relaxed text-foreground">
                      {aiSuggestion}
                    </div>
                  </div>
                ) : null}
              </li>
            )
          })}
        </ul>
      )}
    </div>
  )
}
