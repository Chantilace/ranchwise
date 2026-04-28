import type { PastureCheckEntry } from "@/lib/pastureCheckTypes"
import type { PastureStatus } from "@/lib/statusUtils"

/**
 * Current pasture status from the latest check (newest by `date`).
 * No checks → `stable`.
 */
export function getPastureDerivedStatus(
  pastureId: string,
  checksByPastureId: Record<string, PastureCheckEntry[]>
): PastureStatus {
  const list = checksByPastureId[pastureId] ?? []
  if (list.length === 0) return "stable"
  const sorted = [...list].sort((a, b) => b.date - a.date)
  const latest = sorted[0]
  return latest.status ?? "stable"
}
