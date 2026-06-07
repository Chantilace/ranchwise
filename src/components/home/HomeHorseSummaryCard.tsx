import { useMemo } from "react"
import { RiToothLine } from "react-icons/ri"
import { Link } from "react-router-dom"
import type { HorseTableRow } from "@/components/RanchWiseHorseRoster"
import { horseRowKey } from "@/components/RanchWiseHorseRoster"
import { CardHeaderArrowLink } from "@/components/ui/card-header-arrow-link"
import { HorseshoeMark } from "@/components/icons/HorseshoeMark"
import { useRanchData } from "@/contexts/RanchDataContext"
import {
  DENTAL_INTERVAL_DAYS,
  FARRIER_INTERVAL_DAYS,
  getCareDueSummary,
  getDentalStatusForHorse,
  getFarrierStatusForHorse,
} from "@/lib/horseCareUtils"
import { homepageCardChromeClass } from "@/lib/homePageCardChrome"
import { HORSE_ROSTER_FIT_FOR_WORK_FILTER_PARAM, isHorseFitForWorkRow } from "@/lib/horseListFilter"
import { cn } from "@/lib/utils"

type CareUrgency = "overdue" | "due-soon"

type CareHorseEntry = {
  horse: HorseTableRow
  urgency: CareUrgency
  daysSince: number
  interval: number
}

function compareCareHorse(a: CareHorseEntry, b: CareHorseEntry): number {
  const aOver = a.urgency === "overdue"
  const bOver = b.urgency === "overdue"
  if (aOver !== bOver) return aOver ? -1 : 1
  if (aOver) {
    return b.daysSince - b.interval - (a.daysSince - a.interval)
  }
  const aLeft = a.interval - a.daysSince
  const bLeft = b.interval - b.daysSince
  return aLeft - bLeft
}

function careNamesLine(entries: CareHorseEntry[], interval: number): string {
  const sorted = [...entries].sort(compareCareHorse)
  if (sorted.length === 0) return "—"
  if (sorted.length > 2) {
    return `${sorted[0].horse.name}, ${sorted[1].horse.name} +${sorted.length - 2} more`
  }
  return sorted
    .map((e) => {
      if (e.urgency === "overdue") {
        return `${e.horse.name} overdue ${e.daysSince - interval}d`
      }
      return `${e.horse.name} due in ${interval - e.daysSince}d`
    })
    .join(", ")
}

function horseAvatarInitials(name: string) {
  const parts = name.trim().split(/\s+/).filter(Boolean)
  if (parts.length === 0) return "?"
  if (parts.length === 1) return parts[0]!.slice(0, 2).toUpperCase()
  return `${parts[0]![0] ?? ""}${parts[parts.length - 1]![0] ?? ""}`.toUpperCase() || "?"
}

function FitForWorkAvatarStack({
  horses,
  maxVisible = 6,
}: {
  horses: HorseTableRow[]
  maxVisible?: number
}) {
  if (horses.length === 0) return null

  const visible = horses.slice(0, maxVisible)
  const remainder = horses.length - visible.length
  const totalFit = horses.length

  return (
    <div className="flex shrink-0 items-center">
      {visible.map((horse, index) => {
        const key = horseRowKey(horse)
        const photo = horse.photoUrl?.trim()
        return (
          <Link
            key={key}
            to={`/horses/${encodeURIComponent(key)}`}
            className={cn(
              "relative inline-flex size-9 shrink-0 overflow-hidden rounded-xl border-2 border-white bg-muted outline-none",
              "transition-[translate,scale,box-shadow] duration-150 ease-out",
              "hover:z-10 hover:-translate-y-2 hover:scale-[1.5] hover:shadow-md",
              "focus-visible:z-10 focus-visible:-translate-y-2 focus-visible:scale-[1.5] focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background"
            )}
            style={{ marginLeft: index === 0 ? 0 : -10 }}
            aria-label={`Open ${horse.name} profile`}
          >
            {photo ? (
              <img
                src={photo}
                alt={horse.name}
                className="size-full object-cover object-center"
                loading="lazy"
              />
            ) : (
              <span className="flex size-full items-center justify-center text-[13px] font-semibold text-muted-foreground">
                {horseAvatarInitials(horse.name)}
              </span>
            )}
          </Link>
        )
      })}
      {remainder > 0 ? (
        <Link
          to={`/horses?filter=${HORSE_ROSTER_FIT_FOR_WORK_FILTER_PARAM}`}
          className={cn(
            "relative flex size-9 shrink-0 cursor-pointer items-center justify-center rounded-xl border-2 border-white bg-secondary text-[13px] font-medium text-secondary-foreground outline-none",
            "transition-[translate,scale,box-shadow,background-color] duration-150 ease-out",
            "hover:z-10 hover:-translate-y-2 hover:scale-[1.5] hover:bg-[var(--color-background-secondary)] hover:shadow-md",
            "focus-visible:z-10 focus-visible:-translate-y-2 focus-visible:scale-[1.5] focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background"
          )}
          style={{ marginLeft: -10 }}
          aria-label={`See all ${totalFit} horses fit for work`}
        >
          +{remainder}
        </Link>
      ) : null}
    </div>
  )
}

export function HomeHorseSummaryCard() {
  const { herdRows, observationsByHorse } = useRanchData()

  const workingHorses = useMemo(() => herdRows.filter((h) => h.role.trim() === "Working"), [herdRows])
  const fitForWorkHorses = useMemo(() => herdRows.filter(isHorseFitForWorkRow), [herdRows])
  const fitForWork = fitForWorkHorses.length
  const totalWorking = workingHorses.length
  const progressPct = totalWorking > 0 ? Math.round((fitForWork / totalWorking) * 100) : 0

  const careDue = useMemo(() => {
    const today = new Date()
    const { farrierHorses, dentalHorses } = getCareDueSummary(herdRows, today, observationsByHorse)

    const farrierEntries: CareHorseEntry[] = farrierHorses.map((horse) => {
      const r = getFarrierStatusForHorse(horse, today, observationsByHorse)
      return {
        horse,
        urgency: r.status === "overdue" ? "overdue" : "due-soon",
        daysSince: r.daysSince,
        interval: FARRIER_INTERVAL_DAYS,
      }
    })
    const dentalEntries: CareHorseEntry[] = dentalHorses.map((horse) => {
      const r = getDentalStatusForHorse(horse, today, observationsByHorse)
      return {
        horse,
        urgency: r.status === "overdue" ? "overdue" : "due-soon",
        daysSince: r.daysSince,
        interval: DENTAL_INTERVAL_DAYS,
      }
    })

    return {
      farrierEntries,
      dentalEntries,
    }
  }, [herdRows, observationsByHorse])

  return (
    <section
      className={cn(
        "flex h-full min-h-0 flex-col rounded-[var(--radius)] p-[18px]",
        homepageCardChromeClass,
      )}
    >
      <div className="mb-3 flex items-center justify-between gap-3">
        <h3 className="text-base font-medium leading-none text-foreground">Horses</h3>
        <CardHeaderArrowLink to="/horses" aria-label="View horses roster" />
      </div>

      <div className="flex min-w-0 items-center justify-between gap-4">
        <p className="flex min-w-0 flex-wrap items-baseline gap-x-1 gap-y-0.5">
          <span className="text-[36px] font-medium leading-none tabular-nums text-foreground">{fitForWork}</span>
          <span className="text-sm text-muted-foreground"> / {totalWorking} fit for work</span>
        </p>
        <FitForWorkAvatarStack horses={fitForWorkHorses} maxVisible={6} />
      </div>

      <div className="mt-5 mb-5 h-1 w-full shrink-0 overflow-hidden rounded-full bg-muted">
        <div
          className="h-full rounded-full bg-status-good-primary transition-[width] duration-300"
          style={{ width: `${progressPct}%` }}
          aria-hidden
        />
      </div>

      <div className="mt-auto pt-4">
        <p className="mb-3 text-[13px] font-medium uppercase tracking-[0.05em] text-[var(--color-text-tertiary)]">
          Care due this week
        </p>

        <div className="grid grid-cols-1 gap-2.5 sm:grid-cols-2">
          <Link
            to="/horses?farrierDue=true"
            className={cn(
              "flex min-w-0 items-center gap-3 rounded-[var(--border-radius-md)] border-[0.5px] p-3 transition-colors duration-150 ease-out",
              "hover:bg-[var(--color-background-secondary)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background"
            )}
            style={{ borderColor: "var(--color-border-tertiary)" }}
            aria-label="View horses due for farrier"
          >
            <div
              className="flex size-8 shrink-0 items-center justify-center rounded-[6px]"
              style={{ background: "#FAEEDA", color: "#854F0B" }}
              aria-hidden
            >
              <HorseshoeMark className="size-[14px]" aria-hidden />
            </div>
            <div className="min-w-0 flex-1">
              <p className="text-sm font-medium leading-none text-foreground">Farrier</p>
              <p className="mt-1 truncate text-[13px] text-muted-foreground">
                {careDue.farrierEntries.length > 0
                  ? careNamesLine(careDue.farrierEntries, FARRIER_INTERVAL_DAYS)
                  : "None due"}
              </p>
            </div>
            <span
              className={cn(
                "shrink-0 text-base font-medium leading-none tabular-nums",
                careDue.farrierEntries.length > 0 ? "text-foreground" : "text-[var(--color-text-tertiary)]"
              )}
            >
              {careDue.farrierEntries.length}
            </span>
          </Link>

          <Link
            to="/horses?dentalDue=true"
            className={cn(
              "flex min-w-0 items-center gap-3 rounded-[var(--border-radius-md)] border-[0.5px] p-3 transition-colors duration-150 ease-out",
              "hover:bg-[var(--color-background-secondary)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background"
            )}
            style={{ borderColor: "var(--color-border-tertiary)" }}
            aria-label="View horses due for dental"
          >
            <div
              className="flex size-8 shrink-0 items-center justify-center rounded-[6px]"
              style={{ background: "#E1F5EE", color: "#0F6E56" }}
              aria-hidden
            >
              <RiToothLine className="size-[14px] shrink-0" aria-hidden />
            </div>
            <div className="min-w-0 flex-1">
              <p className="text-sm font-medium leading-none text-foreground">Dental</p>
              <p className="mt-1 truncate text-[13px] text-muted-foreground">
                {careDue.dentalEntries.length > 0
                  ? careNamesLine(careDue.dentalEntries, DENTAL_INTERVAL_DAYS)
                  : "None due"}
              </p>
            </div>
            <span
              className={cn(
                "shrink-0 text-base font-medium leading-none tabular-nums",
                careDue.dentalEntries.length > 0 ? "text-foreground" : "text-[var(--color-text-tertiary)]"
              )}
            >
              {careDue.dentalEntries.length}
            </span>
          </Link>
        </div>
      </div>
    </section>
  )
}
