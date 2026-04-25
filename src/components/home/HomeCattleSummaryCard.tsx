import { AlertCircle, AlertTriangle, ArrowUpRight, Flag, type LucideIcon } from "lucide-react"
import { useMemo } from "react"
import { Link } from "react-router-dom"
import { useRanchData } from "@/contexts/RanchDataContext"
import { daysRemainingInSeason, getCurrentSeason, RANCH_SEASONS } from "@/lib/calendarUtils"
import { getCalvingStatus } from "@/lib/calvingStatus"
import { cn } from "@/lib/utils"

const CALVING_SEASON = RANCH_SEASONS.find((s) => s.id === "calving")!

type StateCard = {
  id: string
  label: string
  count: number
  href: string
  icon: LucideIcon
  iconBgSoft: string
  iconColor: string
}

export function HomeCattleSummaryCard() {
  const { cattle } = useRanchData()
  const today = new Date()
  const season = getCurrentSeason(today)
  const isCalvingSeason = season.id === "calving"
  const daysLeft = isCalvingSeason ? daysRemainingInSeason(CALVING_SEASON, today) : null

  const { calved, inLabor, complications, flagged } = useMemo(() => {
    const calved = cattle.filter((c) => getCalvingStatus(c) === "calved")
    const inLabor = cattle.filter((c) => getCalvingStatus(c) === "in-labor")
    const complications = cattle.filter((c) => getCalvingStatus(c) === "complications")
    const flagged = cattle.filter((c) => c.healthStatus === "Flag")
    return { calved, inLabor, complications, flagged }
  }, [cattle])

  const total = cattle.length
  const progressPct = total > 0 ? Math.round((calved.length / total) * 100) : 0

  const stateCards: StateCard[] = [
    {
      id: "in-labor",
      label: "In labor",
      count: inLabor.length,
      href: "/cattle?calvingStatus=in-labor",
      icon: AlertTriangle,
      iconBgSoft: "bg-status-monitor-bg-soft",
      iconColor: "text-status-monitor-text",
    },
    {
      id: "complications",
      label: "Complications",
      count: complications.length,
      href: "/cattle?calvingStatus=complications",
      icon: AlertCircle,
      iconBgSoft: "bg-status-flag-bg-soft",
      iconColor: "text-status-flag-text",
    },
    {
      id: "flagged",
      label: "Flagged",
      count: flagged.length,
      href: "/cattle?healthStatus=flag",
      icon: Flag,
      iconBgSoft: "bg-status-flag-bg-soft",
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
        <div className="grid grid-cols-1 gap-2.5 xl:grid-cols-3">
          {visibleStateCards.map((card) => (
            <Link
              key={card.id}
              to={card.href}
              className="group flex cursor-pointer flex-col gap-3 rounded-lg border border-border bg-card p-3.5 transition-colors hover:bg-muted"
            >
              <div className="flex items-center justify-between">
                <div
                  className={cn(
                    "flex size-7 shrink-0 items-center justify-center rounded-md",
                    card.iconBgSoft
                  )}
                >
                  <card.icon className={cn("size-3.5", card.iconColor)} aria-hidden />
                </div>
                <ArrowUpRight
                  className="size-3.5 shrink-0 text-muted-foreground transition-all duration-200 group-hover:text-action group-hover:translate-x-0.5 group-hover:-translate-y-0.5"
                  aria-hidden
                />
              </div>
              <div className="flex items-end justify-between gap-2">
                <div className="min-w-0 flex-1">
                  <p className="text-[13px] font-medium text-foreground">{card.label}</p>
                </div>
                <span className="shrink-0 text-[22px] font-medium leading-none tabular-nums text-foreground">
                  {card.count}
                </span>
              </div>
            </Link>
          ))}
        </div>
      )}
    </section>
  )
}
