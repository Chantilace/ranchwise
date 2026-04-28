import { differenceInCalendarDays, parseISO, startOfDay } from "date-fns"
import { getCalvingStatus } from "@/lib/calvingStatus"
import { getCattleEffectiveHealthRisk, getCattleLastObservationTime } from "@/lib/cattleSelectors"
import { compareRosterLastActivityMs } from "@/lib/rosterLastActivitySort"
import type { Cattle } from "@/types/cattle"
import type { ObservationEntry } from "@/types/observation"

export type CattleMobileRosterPartition = {
  inLabor: Cattle[]
  calvingSoon: Cattle[]
  flagged: Cattle[]
  healthy: Cattle[]
}

/** Assign each row to at most one urgent bucket; remainder go to Healthy. */
export function partitionCattleForMobileRoster(
  rows: readonly Cattle[],
  observationsByCattleId: Record<string, ObservationEntry[]>,
): CattleMobileRosterPartition {
  const inLabor: Cattle[] = []
  const calvingSoon: Cattle[] = []
  const flagged: Cattle[] = []
  const used = new Set<string>()

  for (const c of rows) {
    if (getCalvingStatus(c) === "in-labor") {
      inLabor.push(c)
      used.add(c.id)
    }
  }
  for (const c of rows) {
    if (used.has(c.id)) continue
    if (getCalvingStatus(c) === "calving-soon") {
      calvingSoon.push(c)
      used.add(c.id)
    }
  }
  for (const c of rows) {
    if (used.has(c.id)) continue
    if (getCattleEffectiveHealthRisk(c, observationsByCattleId) === "call-vet") {
      flagged.push(c)
      used.add(c.id)
    }
  }
  const healthy = rows.filter((c) => !used.has(c.id))
  return { inLabor, calvingSoon, flagged, healthy }
}

/** Within each mobile group, order by last observation (same rules as roster last-activity sort). */
export function sortCattleMobilePartitionByLastObservation(
  part: CattleMobileRosterPartition,
  dir: "desc" | "asc",
  observationsByCattleId: Record<string, ObservationEntry[]>,
): CattleMobileRosterPartition {
  const cmp = (a: Cattle, b: Cattle) => {
    const ta = getCattleLastObservationTime(a.id, observationsByCattleId)
    const tb = getCattleLastObservationTime(b.id, observationsByCattleId)
    return compareRosterLastActivityMs(ta, tb, dir)
  }
  return {
    inLabor: [...part.inLabor].sort(cmp),
    calvingSoon: [...part.calvingSoon].sort(cmp),
    flagged: [...part.flagged].sort(cmp),
    healthy: [...part.healthy].sort(cmp),
  }
}

export function cattleDaysUntilDue(c: Cattle): number | null {
  if (!c.dueDate?.trim()) return null
  const due = parseISO(c.dueDate)
  if (!Number.isFinite(due.getTime())) return null
  return differenceInCalendarDays(startOfDay(due), startOfDay(new Date()))
}
