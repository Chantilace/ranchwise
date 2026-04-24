export type Category = "Health" | "Behavior" | "Feeding" | "Calving"

/** Persisted on horse observations for dual-status writeback and to-do derivation. */
export type ObservationDomain = "health" | "behavior"

export type RiskLevel = "call-vet" | "monitor" | "good"

export interface AIResult {
  riskLevel: RiskLevel
  riskLabel: string
  recommendations: string[]
  patternNote: string | null
}

export interface ObservationEntry {
  id: string
  date: string
  category: Category
  /** When set, scopes writeback to health vs behavior on horses; inferred from category if omitted. */
  observationDomain?: ObservationDomain
  notes: string
  loggedBy: string
  aiResult?: AIResult | null
  /**
   * Future (AI): traceability when an individual observation is spawned from a pasture check note
   * (e.g. tag extraction). Complements `PastureCheck.linkedObservationIds` on the cattle domain model.
   */
  sourcePastureCheckId?: string
}
