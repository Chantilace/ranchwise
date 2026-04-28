import { useState } from "react"

import { ObservationCategoryBadge } from "@/components/ObservationCategoryBadge"
import { StatusBadge, type StatusBadgeStatus } from "@/components/StatusBadge"
import { AiActionButton } from "@/components/ai/ai-action-button"
import { formatObservationDateLong } from "@/lib/observationTimelineDisplay"
import type { ObservationEntry, RiskLevel } from "@/types/observation"
import { cn } from "@/lib/utils"

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

function riskLevelToBadgeStatus(level: RiskLevel): StatusBadgeStatus {
  if (level === "call-vet") return "call-vet"
  if (level === "monitor") return "monitor"
  return "good"
}

function riskLevelToPlainLabel(level: RiskLevel): string {
  if (level === "call-vet") return "Flag"
  if (level === "monitor") return "Monitor"
  return "Good"
}

export type ObservationTimelineEntryCardProps = {
  entry: ObservationEntry
  isLatestOfCategory: boolean
}

export function ObservationTimelineEntryCard({
  entry,
  isLatestOfCategory,
}: ObservationTimelineEntryCardProps) {
  const [aiExpanded, setAiExpanded] = useState(false)
  const hasAi = entry.aiResult != null
  const level = observationRiskLevel(entry)
  const aiBodyText =
    observationAiSuggestionText(entry) ??
    (entry.aiResult?.riskLabel?.trim() || null) ??
    ""

  const dateLine = formatObservationDateLong(entry.date)

  return (
    <li className="relative rounded-lg border-[0.5px] border-border bg-white px-4 py-[14px]">
      {hasAi ? (
        <div className="absolute top-[14px] right-4 z-[1]" title="View AI analysis">
          <AiActionButton
            ariaLabel={aiExpanded ? "Hide AI suggestion" : "Show AI suggestion"}
            expanded={aiExpanded}
            className="rounded-md"
            onClick={(e) => {
              e.stopPropagation()
              setAiExpanded((o) => !o)
            }}
          />
        </div>
      ) : null}

      <p className={cn("mb-3 text-[14px] leading-[1.5] text-foreground", hasAi && "pr-8")}>{entry.notes}</p>

      {hasAi && aiExpanded ? (
        <div className="mb-3 overflow-hidden">
          <div className="rounded-lg bg-muted px-3 py-2 text-sm leading-relaxed text-foreground">
            {aiBodyText}
          </div>
        </div>
      ) : null}

      <div className="flex flex-wrap items-center gap-2 text-[13px] text-muted-foreground">
        <span>{dateLine}</span>
        <span aria-hidden>·</span>
        <ObservationCategoryBadge category={entry.category} showIcon={false} variant="timeline" />
        {level ? (
          <>
            <span aria-hidden>·</span>
            {entry.category === "Calving" || isLatestOfCategory ? (
              <StatusBadge status={riskLevelToBadgeStatus(level)} size="sm" emphasis="secondary" />
            ) : (
              <span className="text-[13px] font-normal text-muted-foreground">{riskLevelToPlainLabel(level)}</span>
            )}
          </>
        ) : null}
        <span aria-hidden>·</span>
        <span className="text-[13px] text-muted-foreground">{entry.loggedBy}</span>
      </div>
    </li>
  )
}
