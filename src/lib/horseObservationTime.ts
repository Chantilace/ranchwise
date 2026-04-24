import { formatDistanceToNow } from "date-fns"
import type { HorseTableRow } from "@/components/HeguyRanchCoPilot"
import { horseRowKey } from "@/components/HeguyRanchCoPilot"
import { parseObservationDate } from "@/lib/initialObservations"
import type { ObservationEntry } from "@/types/observation"

/** Latest observation timestamp for a horse (`observationsByHorse`), for sorting / “time since”. */
export function getHorseLatestObservationTimestampMs(
  horse: HorseTableRow,
  observationsByHorse: Record<string, ObservationEntry[]>
): number | null {
  const list = observationsByHorse[horseRowKey(horse)]
  if (!list?.length) return null
  let max = 0
  for (const o of list) {
    const t = parseObservationDate(o.date)
    if (Number.isFinite(t) && t > max) max = t
  }
  return max > 0 ? max : null
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
