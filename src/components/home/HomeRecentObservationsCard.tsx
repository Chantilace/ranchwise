import { Check } from "lucide-react"
import { useMemo, useState } from "react"
import { Link } from "react-router-dom"
import { AiActionButton } from "@/components/ai/ai-action-button"
import type { HorseTableRow } from "@/components/RanchWiseHorseRoster"
import { horseRowKey } from "@/components/RanchWiseHorseRoster"
import { CardHeaderArrowLink } from "@/components/ui/card-header-arrow-link"
import { ROSTER_LAST_ACTIVITY_URL_KEY } from "@/lib/rosterLastActivitySort"
import { StatusBadge, type StatusBadgeStatus } from "@/components/StatusBadge"
import { useRanchData } from "@/contexts/RanchDataContext"
import {
  buildHorseRecentObservationPicks,
  countHorseObservationsLast7Days,
  deriveHorseAttentionSummaryLine,
  type HorseWeeklyAttentionPick,
} from "@/lib/homeHorseSummaryDerivers"
import { homepageCardChromeClass, homepageCategoryBadgeClass } from "@/lib/homePageCardChrome"
import { getObservationDomain } from "@/lib/observationDomain"
import { cn } from "@/lib/utils"
import type { ObservationEntry, RiskLevel } from "@/types/observation"
function shortAgo(entryMs: number): string {
  const now = Date.now()
  const diffMin = Math.floor((now - entryMs) / 60_000)
  if (diffMin < 1) return "<1m ago"
  if (diffMin < 60) return `${diffMin}m ago`
  const diffH = Math.floor((now - entryMs) / 3_600_000)
  if (diffH < 48) return `${diffH}h ago`
  const diffD = Math.floor((now - entryMs) / 86_400_000)
  return `${diffD}d ago`
}

function observationCategoryDisplay(entry: ObservationEntry, horse: HorseTableRow): string {
  if (entry.category === "Behavior" && horse.role === "Training") return "Training"
  if (entry.category === "Behavior") return "Behavior"
  if (entry.category === "Health") return "Health"
  return getObservationDomain(entry) === "behavior" ? "Behavior" : "Health"
}

function observationRiskLevel(entry: ObservationEntry): RiskLevel {
  return entry.aiResult?.riskLevel ?? "good"
}

function riskToBadgeStatus(risk: RiskLevel): StatusBadgeStatus {
  if (risk === "flag") return "flag"
  if (risk === "monitor") return "monitor"
  return "good"
}

function observationAiSuggestionBody(entry: ObservationEntry): string {
  const ai = entry.aiResult
  if (!ai) return deriveHorseAttentionSummaryLine(entry)
  const note = ai.patternNote?.trim()
  if (note) return note
  const recs = ai.recommendations?.map((s) => s.trim()).filter(Boolean) ?? []
  if (recs.length) return recs.join(" ")
  const label = ai.riskLabel?.trim()
  if (label) return label
  return deriveHorseAttentionSummaryLine(entry)
}

function RecentObservationCompactTile({ pick }: { pick: HorseWeeklyAttentionPick }) {
  const [aiExpanded, setAiExpanded] = useState(false)
  const profilePath = `/horses/${horseRowKey(pick.horse)}`
  const hasAi = pick.entry.aiResult != null
  const author = pick.entry.loggedBy?.trim() || "Staff"
  const observationText = (pick.entry.notes ?? "").trim()
  const categoryLabel = observationCategoryDisplay(pick.entry, pick.horse)
  const risk = observationRiskLevel(pick.entry)

  return (
    <div
      className={cn(
        // Nested tiles inside the homepage Recent Observations card should be flat
        // (outer card already carries the lift shadow).
        "flex min-w-0 flex-col rounded-md p-3.5",
        "border-[0.5px] border-[rgba(0,0,0,0.06)] bg-card",
      )}
    >
      <div className="mb-2 flex items-start gap-2.5">
        <Link
          to={profilePath}
          className="h-12 w-12 shrink-0 overflow-hidden rounded-xl bg-muted focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background"
          aria-label={`Open ${pick.horse.name} profile`}
        >
          {pick.horse.photoUrl ? (
            <img
              src={pick.horse.photoUrl}
              alt={pick.horse.name}
              className="size-full object-cover"
              loading="lazy"
            />
          ) : (
            <div
              className="flex size-full items-center justify-center text-[13px] font-semibold text-muted-foreground"
              aria-hidden
            >
              {pick.horse.name.trim().slice(0, 1).toUpperCase() || "?"}
            </div>
          )}
        </Link>

        <div className="min-w-0 flex-1">
          <div className="mb-0.5 flex min-w-0 flex-wrap items-center gap-1.5">
            <p className="min-w-0 text-[15px] font-medium leading-tight text-foreground">{pick.horse.name}</p>
            <span className={cn("shrink-0", homepageCategoryBadgeClass)}>{categoryLabel}</span>
            {risk !== "good" ? (
              <StatusBadge status={riskToBadgeStatus(risk)} size="sm" emphasis="secondary" />
            ) : null}
          </div>
          <p className="text-[13px] text-[var(--color-text-tertiary)]">
            {author} · {shortAgo(pick.entryTime)}
          </p>
        </div>

        {hasAi ? (
          <div className="ml-auto shrink-0 self-start">
            <AiActionButton
              ariaLabel={aiExpanded ? "Hide AI suggestion" : "Show AI suggestion"}
              expanded={aiExpanded}
              className="rounded-md"
              onClick={() => setAiExpanded((o) => !o)}
            />
          </div>
        ) : null}
      </div>

      <p className="min-w-0 text-[14px] leading-relaxed text-[var(--color-text-primary)]">
        {observationText || "—"}
      </p>

      {hasAi ? (
        <div
          className={cn(
            "grid transition-[grid-template-rows] duration-200 ease-out",
            aiExpanded ? "grid-rows-[1fr]" : "grid-rows-[0fr]",
          )}
        >
          <div className="overflow-hidden">
            <div className="mt-2 rounded-lg bg-muted px-2.5 py-2 text-[13px] leading-relaxed text-[var(--color-text-primary)]">
              {observationAiSuggestionBody(pick.entry)}
            </div>
          </div>
        </div>
      ) : null}
    </div>
  )
}

export function HomeRecentObservationsCard() {
  const { herdRows, observationsByHorse } = useRanchData()

  const totalWeekCount = useMemo(
    () => countHorseObservationsLast7Days(herdRows, observationsByHorse, new Date()),
    [herdRows, observationsByHorse],
  )

  const recentPicks = useMemo(
    () => buildHorseRecentObservationPicks(herdRows, observationsByHorse, new Date(), 3),
    [herdRows, observationsByHorse],
  )

  return (
    <section className={cn("flex flex-col rounded-[var(--radius)] p-[18px]", homepageCardChromeClass)}>
      <div className="mb-3 flex min-w-0 flex-wrap items-center justify-between gap-2 gap-y-2">
        <span className="text-base font-medium text-foreground">Recent observations</span>
        <div className="ml-auto flex min-w-0 shrink-0 items-center gap-3">
          <span className="text-[13px] text-[var(--color-text-tertiary)]">
            Last 7 days · {totalWeekCount} logged
          </span>
          <CardHeaderArrowLink
            to={`/horses?${ROSTER_LAST_ACTIVITY_URL_KEY}=newest`}
            aria-label="View horses and observation activity"
          />
        </div>
      </div>

      {recentPicks.length === 0 ? (
        <div className="flex items-center gap-3 rounded-lg bg-muted p-3">
          <div className="flex size-8 shrink-0 items-center justify-center rounded-md bg-status-good-bg">
            <Check className="size-4 text-status-good-text" aria-hidden />
          </div>
          <div className="min-w-0 flex-1">
            <p className="text-sm font-medium text-foreground">No observations this week</p>
            <p className="text-[13px] text-muted-foreground">
              Nothing logged in the last 7 days yet. Use Smart Suggestions above for urgent herd items.
            </p>
          </div>
        </div>
      ) : (
        <div className="grid grid-cols-1 gap-2 md:grid-cols-2 xl:grid-cols-3">
          {recentPicks.map((pick) => (
            <RecentObservationCompactTile
              key={`${horseRowKey(pick.horse)}-${pick.entry.id}`}
              pick={pick}
            />
          ))}
        </div>
      )}
    </section>
  )
}
