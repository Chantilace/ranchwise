import { OBSERVATION_ANALYZE_DELAY_MS, type EntityContext } from "@/lib/observationAnalyzeContext"
import { mockAnalyzeBehavior } from "@/lib/observationAnalyzeBehavior"
import { mockAnalyzeHealth } from "@/lib/observationAnalyzeHealth"
import type { AIResult, Category } from "@/types/observation"

export { buildEntityContextFromCommitMeta, type EntityContext } from "@/lib/observationAnalyzeContext"
export { mockAnalyzePastureCheck } from "@/lib/observationAnalyzePasture"

/** @deprecated Prefer `OBSERVATION_ANALYZE_DELAY_MS` from `observationAnalyzeContext`. */
export const ANALYZE_DELAY_MS = OBSERVATION_ANALYZE_DELAY_MS

/**
 * Placeholder AI — swap internals for Anthropic (or other) API later.
 * Optional `context` supplies prior observations / pasture trend for pattern-aware demos.
 */
export async function mockAnalyze(
  category: Category,
  notes: string,
  animalName: string,
  context?: EntityContext
): Promise<AIResult> {
  await new Promise((r) => setTimeout(r, OBSERVATION_ANALYZE_DELAY_MS))
  if (category === "Behavior") {
    return mockAnalyzeBehavior(notes, animalName, context)
  }
  return mockAnalyzeHealth(category, notes, animalName, context)
}
