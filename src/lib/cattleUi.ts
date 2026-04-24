import { differenceInDays, format, parseISO, startOfDay } from "date-fns"
import { getAiRiskLevelFromObservations } from "@/lib/animalUtils"
import type { Cattle } from "@/types/cattle"
import type { ObservationEntry } from "@/types/observation"

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
    const level = getAiRiskLevelFromObservations(observationsByCattleId[c.id])
    if (level === "call-vet") flagged += 1
    else if (level === "monitor") monitored += 1
    const open = c.calvingStatus === "pregnant" || c.calvingStatus === "in-labor"
    if (open && c.dueDate) {
      if (isDueWithinDaysFromToday(c.dueDate, 14)) calvingSoon += 1
    }
  }
  return { flagged, monitored, calvingSoon }
}
