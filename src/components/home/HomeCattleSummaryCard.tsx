import { AlertCircle, AlertTriangle, ArrowUpRight, Clock, Flag, type LucideIcon } from "lucide-react"
import { useMemo } from "react"
import { Link } from "react-router-dom"
import { useRanchData } from "@/contexts/RanchDataContext"
import { daysRemainingInSeason, getCurrentSeason, RANCH_SEASONS } from "@/lib/calendarUtils"
import { getCalvingStatus } from "@/lib/calvingStatus"
import { cn } from "@/lib/utils"
import type { Cattle } from "@/types/cattle"

const CALVING_SEASON = RANCH_SEASONS.find((s) => s.id === "calving")!

type StateCard = {
  id: string
  label: string
  context: string
  count: number
  href: string
  icon: LucideIcon
  iconBg: string
  iconColor: string
}

function describePastureDistribution(
  animals: Cattle[],
  pastureNameById: Map<string, string>
): string {
  if (animals.length === 0) return "—"
  const counts = new Map<string, number>()
  for (const a of animals) {
    const name = pastureNameById.get(a.pastureId) ?? "Unknown"
    counts.set(name, (counts.get(name) ?? 0) + 1)
  }
  const top = [...counts.entries()]
    .sort((a, b) => b[1] - a[1])
    .slice(0, 2)
  return top.map(([name, n]) => `${n} in ${name.split(/\s+/)[0]}`).join(", ")
}

function countDistinctPastures(
  animals: Cattle[],
  pastureNameById: Map<string, string>
): number {
  const set = new Set<string>()
  for (const a of animals) set.add(pastureNameById.get(a.pastureId) ?? a.pastureId)
  return set.size
}

export function HomeCattleSummaryCard() {
  const { cattle, pastures } = useRanchData()
  const today = new Date()
  const season = getCurrentSeason(today)
  const isCalvingSeason = season.id === "calving"
  const daysLeft = isCalvingSeason ? daysRemainingInSeason(CALVING_SEASON, today) : null

  const pastureNameById = useMemo(() => {
    const m = new Map<string, string>()
    for (const p of pastures) m.set(p.id, p.name)
    return m
  }, [pastures])

  const { calved, inLabor, calvingSoon, complications, flagged } = useMemo(() => {
    const calved = cattle.filter((c) => getCalvingStatus(c) === "calved")
    const inLabor = cattle.filter((c) => getCalvingStatus(c) === "in-labor")
    const calvingSoon = cattle.filter((c) => getCalvingStatus(c) === "calving-soon")
    const complications = cattle.filter((c) => getCalvingStatus(c) === "complications")
    const flagged = cattle.filter((c) => c.healthStatus === "Flag")
    return { calved, inLabor, calvingSoon, complications, flagged }
  }, [cattle])

  const total = cattle.length
  const progressPct = total > 0 ? Math.round((calved.length / total) * 100) : 0

  const stateCards: StateCard[] = [
    {
      id: "in-labor",
      label: "In labor",
      context: describePastureDistribution(inLabor, pastureNameById),
      count: inLabor.length,
      href: "/cattle?calvingStatus=in-labor",
      icon: AlertTriangle,
      iconBg: "bg-status-flag-bg",
      iconColor: "text-status-flag-text",
    },
    {
      id: "calving-soon",
      label: "Calving soon",
      context: "Within 14 days",
      count: calvingSoon.length,
      href: "/cattle?calvingStatus=calving-soon",
      icon: Clock,
      iconBg: "bg-status-monitor-bg",
      iconColor: "text-status-monitor-text",
    },
    {
      id: "complications",
      label: "Complications",
      // TODO: replace with real trend once historical data is wired.
      context: "Up 3 from last week",
      count: complications.length,
      href: "/cattle?calvingStatus=complications",
      icon: AlertCircle,
      iconBg: "bg-status-flag-bg",
      iconColor: "text-status-flag-text",
    },
    {
      id: "flagged",
      label: "Flagged",
      context: `Across ${countDistinctPastures(flagged, pastureNameById)} pastures`,
      count: flagged.length,
      href: "/cattle?healthStatus=flag",
      icon: Flag,
      iconBg: "bg-status-flag-bg",
      iconColor: "text-status-flag-text",
    },
  ]

  const visibleStateCards = stateCards.filter((c) => c.count > 0)

  return (
    <section className="flex flex-col gap-4 rounded-lg border border-border bg-card p-5">
      <div className="flex items-center justify-between gap-3">
        <div className="flex min-w-0 items-center gap-2">
          <h3 className="text-lg font-medium leading-none text-foreground">Cattle</h3>
          {isCalvingSeason && daysLeft !== null && (
            <span className="shrink-0 rounded-full bg-muted px-2.5 py-0.5 text-[11px] font-medium text-foreground">
              Calving · {daysLeft} {daysLeft === 1 ? "day" : "days"} left
            </span>
          )}
        </div>
        <Link
          to="/cattle"
          aria-label="Open cattle overview"
          className="group inline-flex size-7 shrink-0 items-center justify-center rounded-md transition-colors hover:bg-muted"
        >
          <ArrowUpRight className="size-4 shrink-0 text-muted-foreground transition-all duration-200 group-hover:text-action group-hover:translate-x-0.5 group-hover:-translate-y-0.5" />
        </Link>
      </div>

      <div className="flex flex-col gap-2">
        <p className="flex items-baseline gap-1">
          <span className="text-2xl font-medium leading-none tabular-nums text-foreground">
            {calved.length}
          </span>
          <span className="text-[13px] text-muted-foreground"> / {total} calved</span>
        </p>
        <div className="h-1 w-full overflow-hidden rounded-full bg-muted">
          <div
            className="h-full rounded-full bg-action transition-[width] duration-300"
            style={{ width: `${progressPct}%` }}
            aria-hidden
          />
        </div>
      </div>

      {visibleStateCards.length > 0 && (
        <div className="flex flex-col gap-2">
          {visibleStateCards.map((card) => (
            <Link
              key={card.id}
              to={card.href}
              className="group flex items-center gap-3 rounded-lg border border-border bg-card p-3 transition-colors hover:bg-muted"
            >
              <div className={cn("flex size-7 shrink-0 items-center justify-center rounded-md", card.iconBg)}>
                <card.icon className={cn("size-4", card.iconColor)} aria-hidden />
              </div>
              <div className="min-w-0 flex-1">
                <p className="text-sm font-medium leading-tight text-foreground">{card.label}</p>
                <p className="text-[11px] leading-tight text-muted-foreground">{card.context}</p>
              </div>
              <span className="shrink-0 text-[18px] font-medium tabular-nums text-foreground">
                {card.count}
              </span>
              <ArrowUpRight className="size-3 shrink-0 text-muted-foreground transition-all duration-200 group-hover:text-action group-hover:translate-x-0.5 group-hover:-translate-y-0.5" aria-hidden />
            </Link>
          ))}
        </div>
      )}
    </section>
  )
}
