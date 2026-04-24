import { parseObservationDate } from "@/lib/initialObservations"
import type { ObservationEntry, RiskLevel } from "@/types/observation"

/** Most recent observation that includes an AI result (by observation date). */
export function getLatestObservationWithAi(
  observations: ObservationEntry[] | undefined | null
): ObservationEntry | null {
  if (!observations?.length) return null
  const withAi = observations.filter((o) => o.aiResult)
  if (withAi.length === 0) return null
  const sorted = [...withAi].sort(
    (a, b) => parseObservationDate(b.date) - parseObservationDate(a.date)
  )
  return sorted[0] ?? null
}

/** Latest AI `riskLevel` from an observation list (horses, cattle, etc.). */
export function getAiRiskLevelFromObservations(
  observations: ObservationEntry[] | undefined | null
): RiskLevel | null {
  const latest = getLatestObservationWithAi(observations)
  return latest?.aiResult?.riskLevel ?? null
}

/**
 * Same as `getAiRiskLevelFromObservations` — use with `observations` from context
 * (`observationsByHorse[key]` / `observationsByCattleId[id]`), not embedded on the animal row.
 */
export const getAnimalStatus = getAiRiskLevelFromObservations
