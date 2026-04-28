import { differenceInDays, format, parseISO, startOfDay } from "date-fns"
import { getCalvingStatus } from "@/lib/calvingStatus"
import { getCattleEffectiveHealthRisk } from "@/lib/cattleSelectors"
import type { Cattle, EffectiveCalvingStatus } from "@/types/cattle"
import type { ObservationEntry } from "@/types/observation"

/** Canonical stored form: letters + digits, no `#` prefix (seed + new animals). */
export function cattleTagBare(tagNumber: string): string {
  return tagNumber.trim().replace(/^#+/, "")
}

/** Display tag without `#` prefix (handles legacy stored `#H001` by stripping). */
export function formatCattleTagDisplay(tagNumber: string): string {
  return cattleTagBare(tagNumber)
}

/** Due date falls between today and today + `maxInclusiveDays` (inclusive). */
export function isDueWithinDaysFromToday(
  dueDateStr: string | null | undefined,
  maxInclusiveDays: number
): boolean {
  if (!dueDateStr) return false
  const due = startOfDay(parseISO(dueDateStr))
  const today = startOfDay(new Date())
  const diff = differenceInDays(due, today)
  return diff >= 0 && diff <= maxInclusiveDays
}

export function formatDueDateLabel(iso: string | null | undefined): string {
  if (!iso) return "—"
  try {
    return format(parseISO(iso), "MMM d, yyyy")
  } catch {
    return "—"
  }
}

/** Days from today until due (negative = overdue). */
export function daysUntilDue(dueDateStr: string | null | undefined): number | null {
  if (!dueDateStr) return null
  try {
    const due = startOfDay(parseISO(dueDateStr))
    const today = startOfDay(new Date())
    return differenceInDays(due, today)
  } catch {
    return null
  }
}

/** Urgency tier for open cows — red “due this week” only when 0–7 days out (not overdue). */
export type CattleDueTier = "overdue" | "week" | "month" | "later"

export function cattleDueTier(dueDateStr: string | null | undefined): CattleDueTier | null {
  const d = daysUntilDue(dueDateStr)
  if (d === null) return null
  if (d < 0) return "overdue"
  if (d <= 7) return "week"
  if (d <= 30) return "month"
  return "later"
}

export function cattleObservationStorageKey(cattleId: string) {
  return `cattle:${cattleId}`
}

/** Good / monitor / flagged counts for herd health bar (full herd; uses effective health from observations + roster hint). */
export function countCattleHerdHealthForBar(
  herd: readonly Cattle[],
  observationsByCattleId: Record<string, ObservationEntry[]>
): { good: number; monitor: number; flagged: number } {
  let good = 0
  let monitor = 0
  let flagged = 0
  for (const c of herd) {
    const r = getCattleEffectiveHealthRisk(c, observationsByCattleId)
    if (r === "call-vet") flagged += 1
    else if (r === "monitor") monitor += 1
    else good += 1
  }
  return { good, monitor, flagged }
}

/** Per-effective-calving counts for roster pills (Open = `none`; pregnant vs calving-soon follows `getCalvingStatus`). */
export function countCattleByEffectiveCalving(herd: readonly Cattle[]): Record<EffectiveCalvingStatus, number> {
  const counts: Record<EffectiveCalvingStatus, number> = {
    pregnant: 0,
    "calving-soon": 0,
    "in-labor": 0,
    calved: 0,
    complications: 0,
    none: 0,
  }
  for (const c of herd) {
    counts[getCalvingStatus(c)] += 1
  }
  return counts
}

export function getPastureSignalCounts(
  pastureId: string,
  cattle: Cattle[],
  observationsByCattleId: Record<string, ObservationEntry[]>
): { flagged: number; monitored: number; calvingSoon: number } {
  const pastureAnimals = cattle.filter((c) => c.pastureId === pastureId)
  let flagged = 0
  let monitored = 0
  let calvingSoon = 0
  for (const c of pastureAnimals) {
    const level = getCattleEffectiveHealthRisk(c, observationsByCattleId)
    if (level === "call-vet") flagged += 1
    else if (level === "monitor") monitored += 1
    const open = c.calvingStatus === "pregnant" || c.calvingStatus === "in-labor"
    if (open && c.dueDate) {
      if (isDueWithinDaysFromToday(c.dueDate, 14)) calvingSoon += 1
    }
  }
  return { flagged, monitored, calvingSoon }
}
