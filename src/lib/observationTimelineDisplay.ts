import { format } from "date-fns"

import { parseObservationDate } from "@/lib/initialObservations"
import type { ObservationEntry } from "@/types/observation"

/** Full month, day, year (e.g. "Apr 7, 2026") from M/D/YY observation date strings. */
export function formatObservationDateLong(dateStr: string): string {
  const t = parseObservationDate(dateStr)
  if (!Number.isFinite(t) || t <= 0) return dateStr.trim()
  try {
    return format(new Date(t), "MMM d, yyyy")
  } catch {
    return dateStr.trim()
  }
}

/**
 * IDs of observations that are the newest in their category (by `parseObservationDate`),
 * computed on the full list passed in (not a filtered view).
 */
export function computeLatestObservationEntryIdsByCategory(
  entries: readonly ObservationEntry[],
): Set<string> {
  const sorted = [...entries].sort((a, b) => parseObservationDate(b.date) - parseObservationDate(a.date))
  const map = new Map<string, string>()
  for (const entry of sorted) {
    if (!map.has(entry.category)) map.set(entry.category, entry.id)
  }
  return new Set(map.values())
}
