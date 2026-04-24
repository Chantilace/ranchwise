import { ArrowUpRight } from "lucide-react"
import { addDays, differenceInDays, parseISO } from "date-fns"
import { Link, useNavigate } from "react-router-dom"
import { CareDuePill } from "@/components/home/CareDuePill"
import { useRanchData } from "@/contexts/RanchDataContext"

const FARRIER_INTERVAL_DAYS = 84
const DENTAL_INTERVAL_DAYS = 365
const FARRIER_DUE_WINDOW = 30
const DENTAL_DUE_WINDOW = 60

function isDueSoon(lastDate: string | null | undefined, interval: number, window: number): boolean {
  if (!lastDate) return false
  try {
    const next = addDays(parseISO(lastDate), interval)
    const daysUntil = differenceInDays(next, new Date())
    return daysUntil <= window
  } catch {
    return false
  }
}

export function HomeHorseSummaryCard() {
  const { herdRows } = useRanchData()
  const navigate = useNavigate()

  const workingHorses = herdRows.filter((h) => h.role === "Working")
  const fitForWork = workingHorses.filter((h) => h.healthStatus === "good").length
  const totalWorking = workingHorses.length
  const flagged = herdRows.filter(
    (h) => h.healthStatus === "flag" || h.behaviorStatus === "flag"
  ).length
  const onMonitor = herdRows.filter((h) => h.healthStatus === "monitor").length

  const farrierDue = herdRows.filter((h) =>
    isDueSoon(h.lastFarrier ?? h.lastFarrierDate, FARRIER_INTERVAL_DAYS, FARRIER_DUE_WINDOW)
  ).length

  const dentalDue = herdRows.filter((h) =>
    isDueSoon(h.lastDentalDate, DENTAL_INTERVAL_DAYS, DENTAL_DUE_WINDOW)
  ).length

  const progressPct =
    totalWorking > 0 ? Math.min(100, Math.round((fitForWork / totalWorking) * 100)) : 0

  const showCareSection = farrierDue > 0 || dentalDue > 0

  return (
    <div className="shadow-card-strong flex h-full min-h-[240px] min-w-0 w-full flex-col rounded-xl border-[0.5px] border-border bg-card px-[18px] py-4 text-left">
      <Link
        to="/horses"
        className="group block rounded-lg outline-none transition-colors duration-[120ms] focus-visible:ring-2 focus-visible:ring-ring/40"
        aria-label="Open horses overview"
      >
        <div className="mb-[14px] flex items-start justify-between gap-2">
          <div className="flex min-w-0 items-center gap-2">
            <span className="text-[16px] font-medium text-foreground">Horses</span>
            <span className="inline-flex items-center rounded-full bg-muted px-2 py-0.5 text-xs font-medium text-foreground">
              Fitness & care
            </span>
          </div>
          <div
            className="flex h-7 w-7 shrink-0 items-center justify-center rounded-[7px] bg-muted transition-colors duration-[120ms] group-hover:bg-muted-deeper"
            aria-hidden
          >
            <ArrowUpRight className="h-[13px] w-[13px] text-foreground" strokeWidth={2} />
          </div>
        </div>

        <div className="mb-1.5 flex items-end gap-1">
          <span className="text-[26px] font-medium tracking-tight text-foreground">{fitForWork}</span>
          <span className="pb-1 text-[13px] text-muted-foreground">/ {totalWorking} fit for work</span>
        </div>
        <div className="mb-[14px] h-[5px] rounded-[3px] bg-muted">
          <div
            className="h-full rounded-[3px] bg-status-good-bg"
            style={{ width: `${progressPct}%` }}
          />
        </div>
      </Link>

      <div className="flex min-w-0 flex-1 flex-col">
        <div className="mb-4 flex min-w-0 flex-col gap-1.5">
          {flagged > 0 ? (
            <button
              type="button"
              onClick={() => navigate("/horses?healthStatus=flag")}
              className="flex min-w-0 cursor-pointer items-center justify-between gap-3 rounded-lg border-[0.5px] border-border px-3 py-2 text-left transition-colors duration-[120ms] hover:border-[var(--border-strong)] hover:bg-muted/50 focus-visible:ring-2 focus-visible:ring-ring/40"
            >
              <p className="min-w-0 shrink text-xs text-muted-foreground">Flagged</p>
              <p className="shrink-0 text-right text-base font-medium tabular-nums text-status-flag-text">
                {flagged}
              </p>
            </button>
          ) : null}
          <button
            type="button"
            onClick={() => navigate("/horses?healthStatus=monitor")}
            className="flex min-w-0 cursor-pointer items-center justify-between gap-3 rounded-lg border-[0.5px] border-border px-3 py-2 text-left transition-colors duration-[120ms] hover:border-[var(--border-strong)] hover:bg-muted/50 focus-visible:ring-2 focus-visible:ring-ring/40"
          >
            <p className="min-w-0 shrink text-xs text-muted-foreground">On monitor</p>
            <p className="shrink-0 text-right text-base font-medium tabular-nums text-foreground">
              {onMonitor}
            </p>
          </button>
        </div>

        {showCareSection ? (
          <div className="pt-[14px]">
            <p className="mb-2 text-xs font-medium uppercase tracking-[0.08em] text-muted-foreground">
              Care due
            </p>
            <div className="flex flex-wrap gap-1">
              {farrierDue > 0 ? (
                <CareDuePill
                  label="Farrier"
                  count={farrierDue}
                  onClick={() => navigate("/horses?farrierDue=true")}
                />
              ) : null}
              {dentalDue > 0 ? (
                <CareDuePill
                  label="Dental"
                  count={dentalDue}
                  onClick={() => navigate("/horses?dentalDue=true")}
                />
              ) : null}
            </div>
          </div>
        ) : null}
      </div>
    </div>
  )
}
