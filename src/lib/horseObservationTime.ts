import { formatDistanceToNow } from "date-fns"
import type { HorseTableRow } from "@/components/RanchWiseHorseRoster"
import { getHorseLastObservationTimeMs } from "@/lib/rosterLastActivitySort"
import type { ObservationEntry } from "@/types/observation"

/** Latest observation timestamp for a horse (`observationsByHorse`), for sorting / “time since”. */
export function getHorseLatestObservationTimestampMs(
  horse: HorseTableRow,
  observationsByHorse: Record<string, ObservationEntry[]>
): number | null {
  return getHorseLastObservationTimeMs(horse, observationsByHorse)
}

/** Relative time since last observation (e.g. “2 days ago”) — mirrors `relativeTime` usage in specs. */
export function relativeTimeSinceObservation(
  horse: HorseTableRow,
  observationsByHorse: Record<string, ObservationEntry[]>
): string {
  const t = getHorseLatestObservationTimestampMs(horse, observationsByHorse)
  if (t == null) return "—"
  return formatDistanceToNow(new Date(t), { addSuffix: true })
}
