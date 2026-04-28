import type { Pasture } from "@/types/cattle"
import { differenceInCalendarDays, parseISO, startOfDay } from "date-fns"

/** Calendar days since the latest logged pasture check, or null if unknown. */
export function pastureDaysSinceLastCheck(p: Pasture): number | null {
  if (!p.lastCheckDate) return null
  const t = parseISO(p.lastCheckDate)
  if (!Number.isFinite(t.getTime())) return null
  return differenceInCalendarDays(startOfDay(new Date()), startOfDay(t))
}

export function isPastureCheckOverdue(p: Pasture, minDays = 10): boolean {
  const d = pastureDaysSinceLastCheck(p)
  return d !== null && d > minDays
}

/** Roster summary tiers: ≤9 days recent, 10–13 borderline, 14+ or unknown overdue. */
export type PastureRosterCheckSummaryTier = "recent" | "borderline" | "overdue"

export function pastureRosterCheckSummaryTier(p: Pasture): PastureRosterCheckSummaryTier {
  const d = pastureDaysSinceLastCheck(p)
  if (d === null) return "overdue"
  if (d <= 9) return "recent"
  if (d <= 13) return "borderline"
  return "overdue"
}
