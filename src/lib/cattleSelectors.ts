import { formatDistanceToNow } from "date-fns"
import { getAiRiskLevelFromObservations } from "@/lib/animalUtils"
import { parseObservationDate } from "@/lib/initialObservations"
import type { Cattle } from "@/types/cattle"
import type { ObservationEntry, RiskLevel } from "@/types/observation"

/** Latest AI risk across all cattle observations (canonical with pasture signal counts). */
export function getCattleDisplayHealth(
  cattleId: string,
  observationsByCattleId: Record<string, ObservationEntry[]>
): RiskLevel | null {
  const observations = observationsByCattleId[cattleId] ?? []
  return getAiRiskLevelFromObservations(observations)
}

function storedHealthToRiskLevel(health?: Cattle["healthStatus"]): RiskLevel {
  if (health === "Flag") return "flag"
  if (health === "Monitor") return "monitor"
  return "good"
}

/**
 * Effective health risk for UI and filters: derived from observations when any AI risk exists;
 * otherwise falls back to `Cattle.healthStatus` seed hint (e.g. new animal before first AI log).
 */
export function getCattleEffectiveHealthRisk(
  cattle: Pick<Cattle, "id" | "healthStatus">,
  observationsByCattleId: Record<string, ObservationEntry[]>
): RiskLevel {
  const fromObs = getCattleDisplayHealth(cattle.id, observationsByCattleId)
  if (fromObs !== null) return fromObs
  return storedHealthToRiskLevel(cattle.healthStatus)
}

export function cattleEffectiveHealthBucket(
  cattle: Pick<Cattle, "id" | "healthStatus">,
  observationsByCattleId: Record<string, ObservationEntry[]>
): "Flag" | "Monitor" | "Good" {
  const r = getCattleEffectiveHealthRisk(cattle, observationsByCattleId)
  if (r === "flag") return "Flag"
  if (r === "monitor") return "Monitor"
  return "Good"
}

/** Max observation timestamp (ms), or null if none / unparsable. */
export function getCattleLastObservationTime(
  cattleId: string,
  observationsByCattleId: Record<string, ObservationEntry[]>
): number | null {
  const observations = observationsByCattleId[cattleId] ?? []
  if (observations.length === 0) return null
  let max = 0
  for (const o of observations) {
    const t = parseObservationDate(o.date)
    if (Number.isFinite(t) && t > max) max = t
  }
  return max > 0 ? max : null
}

export function getCattleLastObservationLabel(
  cattleId: string,
  observationsByCattleId: Record<string, ObservationEntry[]>
): string {
  const t = getCattleLastObservationTime(cattleId, observationsByCattleId)
  if (t === null) return "No observations yet"
  return formatDistanceToNow(new Date(t), { addSuffix: true })
}
