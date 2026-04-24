import { ArrowUpRight } from "lucide-react"
import { useMemo } from "react"
import { Link, useNavigate } from "react-router-dom"
import { useRanchData } from "@/contexts/RanchDataContext"
import {
  daysRemainingInSeason,
  daysUntilSeasonStart,
  getCurrentSeason,
  RANCH_SEASONS,
} from "@/lib/calendarUtils"
import { countCattleCareDue, type CattleCareDueKind } from "@/lib/cattleCareDue"
import { getCalvingStatus } from "@/lib/calvingStatus"
import type { RanchSeason } from "@/lib/calendarUtils"
import { CareDuePill } from "@/components/home/CareDuePill"
import { cn } from "@/lib/utils"

const CALVING_SEASON = RANCH_SEASONS.find((s) => s.id === "calving")!

type Phase = "pre-calving" | "calving" | "branding" | "turnout" | "dry"

function phaseFromSeason(season: RanchSeason): Phase {
  if (season.id === "calving") return "calving"
  if (season.id === "branding") return "branding"
  if (season.id === "turnout") return "turnout"
  if (season.id === "winter") return "pre-calving"
  if (season.id === "gathering") return "dry"
  return "dry"
}

function pastureLabelShort(name: string): string {
  const first = name.split(/\s+/)[0] ?? name
  return first.length <= 9 ? first : `${first.slice(0, 8)}…`
}

type StatRow = { label: string; value: string; warn: boolean; pastureId?: string }

export function HomeCattleSummaryCard() {
  const { cattle, pastures } = useRanchData()
  const navigate = useNavigate()
  const today = new Date()
  const season = getCurrentSeason(today)
  const phase = phaseFromSeason(season)

  const total = cattle.length
  const calved = useMemo(
    () => cattle.filter((c) => getCalvingStatus(c) === "calved").length,
    [cattle]
  )
  const calvingSoon = useMemo(
    () => cattle.filter((c) => getCalvingStatus(c) === "calving-soon").length,
    [cattle]
  )
  const complications = useMemo(
    () => cattle.filter((c) => getCalvingStatus(c) === "complications").length,
    [cattle]
  )
  const pregnant = useMemo(
    () => cattle.filter((c) => getCalvingStatus(c) === "pregnant").length,
    [cattle]
  )
  const flagged = useMemo(() => cattle.filter((c) => c.healthStatus === "Flag").length, [cattle])
  const onMonitor = useMemo(() => cattle.filter((c) => c.healthStatus === "Monitor").length, [cattle])

  const onRange = useMemo(
    () =>
      cattle.filter((c) => {
        const p = pastures.find((x) => x.id === c.pastureId)
        return p && p.type !== "bulls"
      }).length,
    [cattle, pastures]
  )

  const branded = calved

  const pastureCounts = useMemo(() => {
    return pastures
      .map((p) => ({
        id: p.id,
        label: pastureLabelShort(p.name),
        n: cattle.filter((c) => c.pastureId === p.id).length,
      }))
      .filter((x) => x.n > 0)
      .sort((a, b) => b.n - a.n)
  }, [cattle, pastures])

  const { phaseLabel, headerMeta, heroPrimary, heroSecondary, progressPct, stats } = useMemo(() => {
    if (phase === "calving") {
      const pct = total > 0 ? Math.min(100, Math.round((calved / total) * 100)) : 0
      return {
        phaseLabel: "Calving",
        headerMeta: `${daysRemainingInSeason(season, today)} days left`,
        heroPrimary: String(calved),
        heroSecondary: `/ ${total} calved`,
        progressPct: pct,
        stats: [
          { label: "Calving soon", value: String(calvingSoon), warn: false },
          { label: "Complications", value: String(complications), warn: complications > 0 },
          { label: "Flagged", value: String(flagged), warn: flagged > 0 },
        ] satisfies StatRow[],
      }
    }
    if (phase === "pre-calving") {
      const daysTo = daysUntilSeasonStart(CALVING_SEASON, today)
      return {
        phaseLabel: "Pre-calving",
        headerMeta: "",
        heroPrimary: String(daysTo),
        heroSecondary: " days to calving",
        progressPct: total > 0 ? Math.min(100, Math.round((pregnant / total) * 100)) : 0,
        stats: [
          { label: "Pregnant", value: String(pregnant), warn: false },
          { label: "Flagged", value: String(flagged), warn: flagged > 0 },
          { label: "Monitor", value: String(onMonitor), warn: false },
        ] satisfies StatRow[],
      }
    }
    if (phase === "branding") {
      const pct = total > 0 ? Math.min(100, Math.round((branded / total) * 100)) : 0
      return {
        phaseLabel: "Branding",
        headerMeta: "",
        heroPrimary: String(branded),
        heroSecondary: `/ ${total} branded`,
        progressPct: pct,
        stats: [
          { label: "Pre-sorted", value: "0", warn: false },
          { label: "Flagged", value: String(flagged), warn: flagged > 0 },
          { label: "Paperwork", value: "0", warn: false },
        ] satisfies StatRow[],
      }
    }
    if (phase === "turnout") {
      const pct = total > 0 ? Math.min(100, Math.round((onRange / total) * 100)) : 0
      const [a, b] = pastureCounts
      let turnoutStats: StatRow[]
      if (a && b) {
        turnoutStats = [
          { label: a.label, value: String(a.n), warn: false, pastureId: a.id },
          { label: b.label, value: String(b.n), warn: false, pastureId: b.id },
          { label: "Flagged", value: String(flagged), warn: flagged > 0 },
        ]
      } else if (a) {
        turnoutStats = [
          { label: a.label, value: String(a.n), warn: false, pastureId: a.id },
          { label: "Monitor", value: String(onMonitor), warn: false },
          { label: "Flagged", value: String(flagged), warn: flagged > 0 },
        ]
      } else {
        turnoutStats = [
          { label: "Flagged", value: String(flagged), warn: flagged > 0 },
          { label: "Monitor", value: String(onMonitor), warn: false },
          { label: "Calving soon", value: String(calvingSoon), warn: calvingSoon > 0 },
        ]
      }
      return {
        phaseLabel: "Turnout",
        headerMeta: "",
        heroPrimary: String(onRange),
        heroSecondary: `/ ${total} on range`,
        progressPct: pct,
        stats: turnoutStats,
      }
    }
    const herdHealthPct =
      total > 0 ? Math.min(100, Math.round(((total - flagged) / total) * 100)) : 0
    return {
      phaseLabel: "At home",
      headerMeta: "",
      heroPrimary: String(total),
      heroSecondary: " cattle",
      progressPct: herdHealthPct,
      stats: [
        { label: "Flagged", value: String(flagged), warn: flagged > 0 },
        { label: "Monitor", value: String(onMonitor), warn: false },
        { label: "Calving soon", value: String(calvingSoon), warn: calvingSoon > 0 },
      ] satisfies StatRow[],
    }
  }, [
    phase,
    season,
    today,
    total,
    calved,
    calvingSoon,
    complications,
    pregnant,
    flagged,
    onMonitor,
    onRange,
    branded,
    pastureCounts,
  ])

  const cattleCarePills = useMemo(() => {
    const defs: { kind: CattleCareDueKind; label: string }[] = [
      { kind: "vaccination", label: "Vax" },
      { kind: "deworming", label: "Deworm" },
      { kind: "pregnancy-check", label: "Preg" },
      { kind: "branding", label: "Brand" },
    ]
    return defs
      .map((d) => ({ ...d, count: countCattleCareDue(cattle, d.kind) }))
      .filter((p) => p.count > 0)
  }, [cattle])

  function navigateForStatRow(s: StatRow) {
    if (s.pastureId) {
      navigate(`/cattle/${s.pastureId}`)
      return
    }
    if (s.label === "Calving soon") {
      navigate("/cattle?calvingStatus=calving-soon")
      return
    }
    if (s.label === "Complications") {
      navigate("/cattle?calvingStatus=complications")
      return
    }
    if (s.label === "Flagged") {
      navigate("/cattle?healthStatus=flag")
      return
    }
    if (s.label === "Pregnant") {
      navigate("/cattle?calvingStatus=pregnant")
      return
    }
    if (s.label === "Monitor") {
      navigate("/cattle?healthStatus=monitor")
      return
    }
    navigate("/cattle")
  }

  return (
    <div className="shadow-card-strong flex h-full min-h-[240px] min-w-0 w-full flex-col rounded-xl border-[0.5px] border-border bg-card px-[18px] py-4 text-left">
      <Link
        to="/cattle"
        className="group block rounded-lg outline-none transition-colors duration-[120ms] focus-visible:ring-2 focus-visible:ring-ring/40"
        aria-label="Open cattle overview"
      >
        <div className="mb-[14px] flex items-start justify-between gap-2">
          <div className="flex min-w-0 items-center gap-2">
            <span className="text-[16px] font-medium text-foreground">Cattle</span>
            <span className="inline-flex items-center rounded-full bg-muted px-2 py-0.5 text-xs font-medium text-foreground">
              {phaseLabel}
            </span>
          </div>
          <div
            className="flex h-7 w-7 shrink-0 items-center justify-center rounded-[7px] bg-muted transition-colors duration-[120ms] group-hover:bg-muted-deeper"
            aria-hidden
          >
            <ArrowUpRight className="h-[13px] w-[13px] text-foreground" strokeWidth={2} />
          </div>
        </div>

        <div className="mb-1.5 flex items-end justify-between gap-2">
          <div className="flex min-w-0 items-end gap-1">
            <span className="text-[26px] font-medium tracking-tight text-foreground">{heroPrimary}</span>
            <span className="shrink-0 pb-1 text-[13px] text-muted-foreground">{heroSecondary}</span>
          </div>
          {headerMeta ? (
            <span className="shrink-0 pb-1 text-right text-xs leading-snug text-muted-foreground">
              {headerMeta}
            </span>
          ) : null}
        </div>
        <div className="mb-[14px] h-[5px] rounded-[3px] bg-muted">
          <div className="h-full rounded-[3px] bg-action" style={{ width: `${progressPct}%` }} />
        </div>
      </Link>

      <div className="mt-auto flex min-w-0 flex-col">
        <div className="mb-4 flex min-w-0 flex-col gap-1.5">
          {stats.map((s, i) => (
            <button
              key={`${i}-${s.label}`}
              type="button"
              onClick={() => navigateForStatRow(s)}
              className="flex min-w-0 cursor-pointer items-center justify-between gap-3 rounded-lg border-[0.5px] border-border px-3 py-2 text-left transition-colors duration-[120ms] hover:border-[var(--border-strong)] hover:bg-muted/50 focus-visible:ring-2 focus-visible:ring-ring/40"
            >
              <p className="min-w-0 shrink text-xs text-muted-foreground">{s.label}</p>
              <p
                className={cn(
                  "shrink-0 text-right text-base font-medium tabular-nums",
                  s.warn ? "text-status-flag-text" : "text-foreground"
                )}
              >
                {s.value}
              </p>
            </button>
          ))}
        </div>

        {cattleCarePills.length > 0 ? (
          <div className="pt-[14px]">
            <p className="mb-2 text-xs font-medium uppercase tracking-[0.08em] text-muted-foreground">
              Care due
            </p>
            <div className="flex flex-wrap gap-1">
              {cattleCarePills.map((p) => (
                <CareDuePill
                  key={p.kind}
                  label={p.label}
                  count={p.count}
                  onClick={() => navigate(`/cattle?careDue=${encodeURIComponent(p.kind)}`)}
                />
              ))}
            </div>
          </div>
        ) : null}
      </div>
    </div>
  )
}
