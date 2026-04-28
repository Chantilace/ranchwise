import { useMemo } from "react"
import { CardHeaderArrowLink } from "@/components/ui/card-header-arrow-link"
import { useRanchData } from "@/contexts/RanchDataContext"
import { cattleEffectiveHealthBucket } from "@/lib/cattleSelectors"
import { daysRemainingInSeason, getCurrentSeason, RANCH_SEASONS } from "@/lib/calendarUtils"
import { getCalvingStatus } from "@/lib/calvingStatus"
import type { Cattle } from "@/types/cattle"
import type { ObservationEntry } from "@/types/observation"

const CALVING_SEASON = RANCH_SEASONS.find((s) => s.id === "calving")!

/** Mutually exclusive buckets: health Flag wins; else calving in-labor; else complications. */
function computeCattleDonutCounts(
  cattleList: readonly Cattle[],
  observationsByCattleId: Record<string, ObservationEntry[]>
): { inLabor: number; complications: number; flagged: number; total: number } {
  let inLabor = 0
  let complications = 0
  let flagged = 0
  for (const c of cattleList) {
    if (cattleEffectiveHealthBucket(c, observationsByCattleId) === "Flag") {
      flagged++
      continue
    }
    const cs = getCalvingStatus(c)
    if (cs === "in-labor") {
      inLabor++
      continue
    }
    if (cs === "complications") {
      complications++
      continue
    }
  }
  return {
    inLabor,
    complications,
    flagged,
    total: inLabor + complications + flagged,
  }
}

function CattleAttentionDonut({
  inLabor,
  complications,
  flagged,
}: {
  inLabor: number
  complications: number
  flagged: number
}) {
  const total = inLabor + complications + flagged
  const radius = 48
  const circumference = 2 * Math.PI * radius
  const flaggedArc = total > 0 ? (flagged / total) * circumference : 0
  const complicationsArc = total > 0 ? (complications / total) * circumference : 0
  const inLaborArc = total > 0 ? (inLabor / total) * circumference : 0

  return (
    <div className="flex items-center gap-6">
      <svg
        width={120}
        height={120}
        viewBox="0 0 120 120"
        className="shrink-0"
        role="img"
        aria-label={`On watch: ${total}. In labor ${inLabor}, complications ${complications}, flagged ${flagged}.`}
      >
        <circle
          cx="60"
          cy="60"
          r={radius}
          fill="none"
          stroke="var(--color-background-secondary)"
          strokeWidth="14"
        />
        {total > 0 && (
          <>
            <circle
              cx="60"
              cy="60"
              r={radius}
              fill="none"
              stroke="var(--badge-flag-bg)"
              strokeWidth="14"
              strokeDasharray={`${flaggedArc} ${circumference}`}
              strokeDashoffset="0"
              transform="rotate(-90 60 60)"
            />
            <circle
              cx="60"
              cy="60"
              r={radius}
              fill="none"
              stroke="var(--badge-monitor-mid-bg)"
              strokeWidth="14"
              strokeDasharray={`${complicationsArc} ${circumference}`}
              strokeDashoffset={`-${flaggedArc}`}
              transform="rotate(-90 60 60)"
            />
            <circle
              cx="60"
              cy="60"
              r={radius}
              fill="none"
              stroke="var(--badge-monitor-mid-bg)"
              strokeWidth="14"
              strokeDasharray={`${inLaborArc} ${circumference}`}
              strokeDashoffset={`-${flaggedArc + complicationsArc}`}
              transform="rotate(-90 60 60)"
            />
          </>
        )}
        <text
          x="60"
          y="56"
          textAnchor="middle"
          fontSize="22"
          fontWeight="500"
          fill="var(--color-text-primary)"
        >
          {total}
        </text>
        <text
          x="60"
          y="74"
          textAnchor="middle"
          fontSize="10"
          fill="var(--color-text-tertiary)"
          letterSpacing="0.5"
        >
          {total > 0 ? "ON WATCH" : "ALL CLEAR"}
        </text>
      </svg>

      <div className="flex flex-1 flex-col gap-3">
        <div className="flex items-center gap-2.5">
          <span
            className="size-2.5 shrink-0 rounded-sm"
            style={{ background: "var(--badge-monitor-mid-bg)" }}
          />
          <span className="flex-1 text-[13px] text-muted-foreground">In labor</span>
          <span className="text-base font-medium tabular-nums text-foreground">{inLabor}</span>
        </div>
        <div className="flex items-center gap-2.5">
          <span
            className="size-2.5 shrink-0 rounded-sm"
            style={{ background: "var(--badge-monitor-mid-bg)" }}
          />
          <span className="flex-1 text-[13px] text-muted-foreground">Complications</span>
          <span className="text-base font-medium tabular-nums text-foreground">{complications}</span>
        </div>
        <div className="flex items-center gap-2.5">
          <span
            className="size-2.5 shrink-0 rounded-sm"
            style={{ background: "var(--badge-flag-bg)" }}
          />
          <span className="flex-1 text-[13px] text-muted-foreground">Flagged</span>
          <span className="text-base font-medium tabular-nums text-foreground">{flagged}</span>
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

  const { calved, total, progressPct, donutInLabor, donutComplications, donutFlagged } = useMemo(() => {
    const calved = cattle.filter((c) => getCalvingStatus(c) === "calved")
    const herdTotal = cattle.length
    const progressPct = herdTotal > 0 ? Math.round((calved.length / herdTotal) * 100) : 0
    const donut = computeCattleDonutCounts(cattle, observationsByCattleId)
    return {
      calved,
      total: herdTotal,
      progressPct,
      donutInLabor: donut.inLabor,
      donutComplications: donut.complications,
      donutFlagged: donut.flagged,
    }
  }, [cattle, observationsByCattleId])

  const daysPart =
    isCalvingSeason && daysLeft !== null
      ? ` · ${daysLeft} ${daysLeft === 1 ? "day" : "days"} left`
      : ""

  return (
    <section className="flex h-full min-h-0 flex-col rounded-[var(--radius)] border-[0.5px] border-border bg-card p-[18px]">
      <div className="mb-3 flex items-center justify-between gap-3">
        <h3 className="text-base font-medium leading-none text-foreground">Cattle</h3>
        <CardHeaderArrowLink to="/cattle" aria-label="View cattle roster" />
      </div>

      <div className="flex flex-wrap items-baseline gap-x-1 gap-y-0.5">
        <span className="text-[36px] font-medium leading-none tabular-nums text-foreground">
          {calved.length}
        </span>
        <span className="text-sm text-muted-foreground">
          / {total} calved{daysPart}
        </span>
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
          inLabor={donutInLabor}
          complications={donutComplications}
          flagged={donutFlagged}
        />
      </div>
    </section>
  )
}
