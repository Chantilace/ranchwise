import { format, isValid, parseISO } from "date-fns"
import { getAiRiskLevelFromObservations } from "@/lib/animalUtils"
import type { ObservationEntry, RiskLevel } from "@/types/observation"

export { getLatestObservationWithAi } from "@/lib/animalUtils"

/** @deprecated Prefer `getAiRiskLevelFromObservations` from `@/lib/animalUtils`. */
export function getHorseAiRiskLevel(
  observations: ObservationEntry[] | undefined | null
): RiskLevel | null {
  return getAiRiskLevelFromObservations(observations)
}

export function riskLevelToModalStatusBadge(
  level: RiskLevel | null
): "Flag" | "Monitor" | "Good" | undefined {
  if (level === "call-vet") return "Flag"
  if (level === "monitor") return "Monitor"
  if (level === "good") return "Good"
  return undefined
}

export function aiRiskLevelSortOrder(level: RiskLevel | null): number {
  if (level === "call-vet") return 0
  if (level === "monitor") return 1
  if (level === "good") return 2
  return 3
}

export function formatFarrierDateDisplay(iso: string | null | undefined): string {
  if (!iso?.trim()) return "—"
  try {
    const d = parseISO(iso)
    if (!isValid(d)) return "—"
    return format(d, "MM/dd/yy")
  } catch {
    return "—"
  }
}
