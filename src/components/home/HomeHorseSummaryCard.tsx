import { ArrowUpRight, Check } from "lucide-react"
import { compareDesc, format, parse, subDays } from "date-fns"
import { useMemo } from "react"
import { Link } from "react-router-dom"
import { useRanchData } from "@/contexts/RanchDataContext"
import { horseRowKey, type HorseTableRow } from "@/components/HeguyRanchCoPilot"
import { getStatusBadgeClass } from "@/lib/statusUtils"
import { cn } from "@/lib/utils"
import type { ObservationEntry, RiskLevel } from "@/types/observation"

type WeeklyObs = { horse: HorseTableRow; entry: ObservationEntry; parsedDate: Date }

function parseObsDate(s: string): Date | null {
  const d = parse(s, "M/d/yy", new Date())
  return isNaN(d.getTime()) ? null : d
}

function initialsOf(name: string): string {
  return name.split(/\s+/).map((w) => w[0]).slice(0, 2).join("").toUpperCase()
}

function isActionable(risk: RiskLevel | null | undefined): boolean {
  return risk === "call-vet" || risk === "monitor"
}

export function HomeHorseSummaryCard() {
  const { herdRows, observationsByHorse } = useRanchData()

  const workingHorses = herdRows.filter((h) => h.role === "Working")
  const fitForWork = workingHorses.filter((h) => h.healthStatus === "good").length
  const totalWorking = workingHorses.length
  const progressPct = totalWorking > 0 ? Math.round((fitForWork / totalWorking) * 100) : 0

  const weeklyObs = useMemo<WeeklyObs[]>(() => {
    const sevenDaysAgo = subDays(new Date(), 7)
    const result: WeeklyObs[] = []
    for (const horse of herdRows) {
      const key = horseRowKey(horse)
      const entries = observationsByHorse[key] ?? []
      for (const entry of entries) {
        if (!isActionable(entry.aiResult?.riskLevel)) continue
        const parsedDate = parseObsDate(entry.date)
        if (!parsedDate) continue
        if (parsedDate < sevenDaysAgo) continue
        result.push({ horse, entry, parsedDate })
      }
    }
    result.sort((a, b) => {
      const aTier = a.entry.aiResult?.riskLevel === "call-vet" ? 0 : 1
      const bTier = b.entry.aiResult?.riskLevel === "call-vet" ? 0 : 1
      if (aTier !== bTier) return aTier - bTier
      return compareDesc(a.parsedDate, b.parsedDate)
    })
    return result.slice(0, 5)
  }, [herdRows, observationsByHorse])

  return (
    <section className="flex flex-col gap-4 rounded-lg border border-border bg-card p-5">
      <div className="flex items-center justify-between gap-3">
        <h3 className="text-lg font-medium leading-none text-foreground">Horses</h3>
        <Link
          to="/horses"
          aria-label="Open horses overview"
          className="inline-flex size-7 shrink-0 items-center justify-center rounded-md text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
        >
          <ArrowUpRight className="size-4" />
        </Link>
      </div>

      <div className="flex flex-col gap-2">
        <p className="flex items-baseline gap-1">
          <span className="text-2xl font-medium leading-none tabular-nums text-foreground">
            {fitForWork}
          </span>
          <span className="text-[13px] text-muted-foreground"> / {totalWorking} fit for work</span>
        </p>
        <div className="h-1 w-full overflow-hidden rounded-full bg-muted">
          <div
            className="h-full rounded-full bg-status-good-primary transition-[width] duration-300"
            style={{ width: `${progressPct}%` }}
            aria-hidden
          />
        </div>
      </div>

      <div className="border-t border-border pt-2.5">
        <p className="mb-2 text-[10px] font-medium uppercase tracking-[0.05em] text-muted-foreground">
          Observations this week
        </p>

        {weeklyObs.length === 0 ? (
          <div className="flex items-center gap-3 rounded-lg bg-muted p-3">
            <div className="flex size-8 shrink-0 items-center justify-center rounded-md bg-status-good-bg">
              <Check className="size-4 text-status-good-text" aria-hidden />
            </div>
            <div className="min-w-0 flex-1">
              <p className="text-xs font-medium text-foreground">All horses steady this week</p>
              <p className="text-[11px] text-muted-foreground">
                No monitor or flag observations logged in the past 7 days.
              </p>
            </div>
          </div>
        ) : (
          <div className="flex flex-col">
            {weeklyObs.map((item, idx) => (
              <Link
                key={`${horseRowKey(item.horse)}-${item.entry.id}`}
                to={`/horses/${horseRowKey(item.horse)}`}
                className={cn(
                  "-mx-3 flex items-start gap-3 rounded-md px-3 py-3 transition-colors hover:bg-muted",
                  idx > 0 && "border-t-[0.5px] border-border"
                )}
              >
                <div className="size-8 shrink-0 overflow-hidden rounded-lg bg-muted">
                  {item.horse.photoUrl ? (
                    <img src={item.horse.photoUrl} alt="" className="size-full object-cover" />
                  ) : (
                    <div className="flex size-full items-center justify-center text-[12px] font-medium text-muted-foreground">
                      {initialsOf(item.horse.name)}
                    </div>
                  )}
                </div>
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-2">
                    <p className="text-sm font-medium text-foreground">{item.horse.name}</p>
                    {item.entry.aiResult?.riskLevel && (
                      <span className={getStatusBadgeClass(item.entry.aiResult.riskLevel)}>
                        {item.entry.aiResult.riskLevel === "call-vet" ? "Flag" : "Monitor"}
                      </span>
                    )}
                  </div>
                  <p className="text-[13px] leading-[1.5] text-muted-foreground">
                    {item.entry.notes}
                  </p>
                  <p className="mt-0.5 text-[11px] text-muted-foreground">
                    {format(item.parsedDate, "MMM d")} · {item.entry.loggedBy}
                  </p>
                </div>
              </Link>
            ))}
          </div>
        )}
      </div>
    </section>
  )
}
