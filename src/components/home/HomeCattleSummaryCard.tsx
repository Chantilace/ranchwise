import { useMemo } from "react"
import { CardHeaderArrowLink } from "@/components/ui/card-header-arrow-link"
import { useRanchData } from "@/contexts/RanchDataContext"
import { cattleEffectiveHealthBucket } from "@/lib/cattleSelectors"
import { countCattleCalvingSeasonCohort } from "@/lib/cattleUi"
import { daysRemainingInSeason, getCurrentSeason, RANCH_SEASONS } from "@/lib/calendarUtils"
import { homepageCardChromeClass, homepageCategoryBadgeClass } from "@/lib/homePageCardChrome"
import { cn } from "@/lib/utils"
import { getCalvingStatus } from "@/lib/calvingStatus"
import type { Cattle } from "@/types/cattle"
import type { ObservationEntry } from "@/types/observation"

const CALVING_SEASON = RANCH_SEASONS.find((s) => s.id === "calving")!

/**
 * Two views of the same cows:
 * - `legend*` counts each cow in every bucket it qualifies for (a flagged cow that's also
 *   in labor adds to BOTH In labor and Flagged), so the legend reflects the real state.
 * - `ring*` / `total` count each cow once by priority (Flag > in-labor > complications) so the
 *   donut ring and centre number stay distinct (no double-counting / over-filling).
 */
function computeCattleDonutCounts(
  cattleList: readonly Cattle[],
  observationsByCattleId: Record<string, ObservationEntry[]>
): {
  legendInLabor: number
  legendComplications: number
  legendFlagged: number
  ringInLabor: number
  ringComplications: number
  ringFlagged: number
  total: number
} {
  let legendInLabor = 0
  let legendComplications = 0
  let legendFlagged = 0
  let ringInLabor = 0
  let ringComplications = 0
  let ringFlagged = 0
  for (const c of cattleList) {
    const isFlag = cattleEffectiveHealthBucket(c, observationsByCattleId) === "Flag"
    const cs = getCalvingStatus(c)
    const isInLabor = cs === "in-labor"
    const isComplications = cs === "complications"

    if (isFlag) legendFlagged++
    if (isInLabor) legendInLabor++
    if (isComplications) legendComplications++

    // Distinct (priority) assignment for the ring + centre total.
    if (isFlag) ringFlagged++
    else if (isInLabor) ringInLabor++
    else if (isComplications) ringComplications++
  }
  return {
    legendInLabor,
    legendComplications,
    legendFlagged,
    ringInLabor,
    ringComplications,
    ringFlagged,
    total: ringInLabor + ringComplications + ringFlagged,
  }
}

function CattleAttentionDonut({
  ringInLabor,
  ringComplications,
  ringFlagged,
  legendInLabor,
  legendComplications,
  legendFlagged,
}: {
  ringInLabor: number
  ringComplications: number
  ringFlagged: number
  legendInLabor: number
  legendComplications: number
  legendFlagged: number
}) {
  // Centre + ring use the distinct (priority) counts; the legend below uses the overlapping counts.
  const total = ringInLabor + ringComplications + ringFlagged
  const radius = 48
  const circumference = 2 * Math.PI * radius
  const flaggedArc = total > 0 ? (ringFlagged / total) * circumference : 0
  const complicationsArc = total > 0 ? (ringComplications / total) * circumference : 0
  const inLaborArc = total > 0 ? (ringInLabor / total) * circumference : 0

  /** Same ring order as before (flagged → complications → in labor); only non-zero slices render. */
  const segmentRings: { arc: number; stroke: string; key: string }[] = []
  if (ringFlagged > 0) segmentRings.push({ arc: flaggedArc, stroke: "var(--badge-flag-bg)", key: "flagged" })
  if (ringComplications > 0)
    segmentRings.push({ arc: complicationsArc, stroke: "var(--badge-monitor-mid-bg)", key: "complications" })
  if (ringInLabor > 0)
    segmentRings.push({ arc: inLaborArc, stroke: "var(--status-monitor-primary)", key: "in-labor" })

  let cum = 0
  const ringsWithOffset = segmentRings.map((seg) => {
    const offset = cum
    cum += seg.arc
    return { ...seg, offset }
  })

  /** Display size keeps viewBox geometry; scales ring stroke and center type together (~90px). */
  const donutDisplayPx = 90

  return (
    <div className="flex min-w-0 items-center gap-4">
      <svg
        width={donutDisplayPx}
        height={donutDisplayPx}
        viewBox="0 0 120 120"
        className="shrink-0"
        role="img"
        aria-label={`On watch: ${total}. In labor ${legendInLabor}, complications ${legendComplications}, flagged ${legendFlagged}.`}
      >
        <circle
          cx="60"
          cy="60"
          r={radius}
          fill="none"
          stroke="var(--color-background-secondary)"
          strokeWidth="14"
        />
        {ringsWithOffset.map((seg) => (
          <circle
            key={seg.key}
            cx="60"
            cy="60"
            r={radius}
            fill="none"
            stroke={seg.stroke}
            strokeWidth="14"
            strokeDasharray={`${seg.arc} ${circumference}`}
            strokeDashoffset={-seg.offset}
            transform="rotate(-90 60 60)"
          />
        ))}
        <text
          x="60"
          y="60"
          textAnchor="middle"
          dominantBaseline="central"
          fontSize="30"
          fontWeight="500"
          fill="var(--color-text-primary)"
        >
          {total}
        </text>
      </svg>

      <div className="flex min-w-0 flex-1 flex-col gap-3">
        <div className="flex items-center gap-2.5">
          <span
            className="size-2.5 shrink-0 rounded-sm"
            style={{ background: "var(--status-monitor-primary)" }}
          />
          <span className="flex-1 text-[13px] text-muted-foreground">In labor</span>
          <span className="text-base font-medium tabular-nums text-foreground">{legendInLabor}</span>
        </div>
        <div className="flex items-center gap-2.5">
          <span
            className="size-2.5 shrink-0 rounded-sm"
            style={{ background: "var(--badge-monitor-mid-bg)" }}
          />
          <span className="flex-1 text-[13px] text-muted-foreground">Complications</span>
          <span className="text-base font-medium tabular-nums text-foreground">{legendComplications}</span>
        </div>
        <div className="flex items-center gap-2.5">
          <span
            className="size-2.5 shrink-0 rounded-sm"
            style={{ background: "var(--badge-flag-bg)" }}
          />
          <span className="flex-1 text-[13px] text-muted-foreground">Flagged</span>
          <span className="text-base font-medium tabular-nums text-foreground">{legendFlagged}</span>
        </div>
      </div>
    </div>
  )
}

export function HomeCattleSummaryCard() {
  const { cattle, observationsByCattleId } = useRanchData()
  const today = new Date()
  const season = getCurrentSeason(today)
  const isCalvingSeason = season.id === "calving"
  const daysLeft = isCalvingSeason ? daysRemainingInSeason(CALVING_SEASON, today) : null

  const { calvedCount, cohortTotal, progressPct, donut } = useMemo(() => {
    const calved = cattle.filter((c) => getCalvingStatus(c) === "calved")
    const cohortTotal = countCattleCalvingSeasonCohort(cattle)
    const progressPct =
      cohortTotal > 0 ? Math.min(100, Math.round((calved.length / cohortTotal) * 100)) : 0
    const donut = computeCattleDonutCounts(cattle, observationsByCattleId)
    return { calvedCount: calved.length, cohortTotal, progressPct, donut }
  }, [cattle, observationsByCattleId])

  return (
    <section
      className={cn(
        "flex h-full min-h-0 flex-col rounded-[var(--radius)] p-[18px]",
        homepageCardChromeClass,
      )}
    >
      <div className="mb-3 flex min-w-0 items-center justify-between gap-3">
        <div className="flex min-w-0 flex-wrap items-center gap-x-2 gap-y-1">
          <h3 className="text-base font-medium leading-none text-foreground">Cattle</h3>
          {isCalvingSeason && daysLeft !== null ? (
            <span className={homepageCategoryBadgeClass}>
              {daysLeft} {daysLeft === 1 ? "day" : "days"} left in window
            </span>
          ) : null}
        </div>
        <CardHeaderArrowLink to="/cattle" aria-label="View cattle roster" />
      </div>

      <div className="flex min-w-0 items-center justify-between gap-4">
        <p className="flex min-w-0 flex-wrap items-baseline gap-x-1 gap-y-0.5">
          <span className="text-[36px] font-medium leading-none tabular-nums text-foreground">{calvedCount}</span>
          <span className="text-sm text-muted-foreground"> / {cohortTotal} calved</span>
        </p>
      </div>
      <div className="mt-5 mb-5 h-1 w-full shrink-0 overflow-hidden rounded-full bg-muted">
        <div
          className="h-full rounded-full bg-ai-accent transition-[width] duration-300"
          style={{ width: `${progressPct}%` }}
          aria-hidden
        />
      </div>

      <div className="flex min-h-0 flex-1 flex-col">
        <CattleAttentionDonut
          ringInLabor={donut.ringInLabor}
          ringComplications={donut.ringComplications}
          ringFlagged={donut.ringFlagged}
          legendInLabor={donut.legendInLabor}
          legendComplications={donut.legendComplications}
          legendFlagged={donut.legendFlagged}
        />
      </div>
    </section>
  )
}
