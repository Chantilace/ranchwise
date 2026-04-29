/**
 * Northwest pasture issue recurrence (Direction A) — trace without dev server.
 * Run: npx tsx --tsconfig tsconfig.trace.json scripts/trace-northwest-recurrence.mts
 *
 * Side-effect import avoids ESM TDZ (see trace-maverick-regression.mts).
 */
import "../src/lib/observationAnalyze"
import { buildInitialPastureChecksByPastureId } from "../src/lib/pastureCheckSeed"
import {
  buildEntityContextFromCommitMeta,
  type LogObservationCommitAnalyzeMeta,
} from "../src/lib/observationAnalyzeContext"
import {
  detectIssueRecurrence,
  mockAnalyzePastureCheck,
  snapshotsToRecurrencePriors,
} from "../src/lib/observationAnalyzePasture"

const demoNote =
  "Northwest sage flats — bare patches expanded since last check, especially south end. Fence intact, trough clean. No new grazing pressure visible — looks like recovery isn't keeping pace."

const priorChecks = buildInitialPastureChecksByPastureId().northwest ?? []

const meta: LogObservationCommitAnalyzeMeta = {
  kind: "pasture",
  pastureId: "northwest",
  pastureName: "Northwest Pasture",
  priorChecks,
}

const pastureCtx = buildEntityContextFromCommitMeta(meta)
if (pastureCtx?.entityKind !== "pasture") throw new Error("expected pasture context")

const priors = snapshotsToRecurrencePriors(pastureCtx.recentObservations)
const recurrence = detectIssueRecurrence(demoNote, priors)

console.log("--- trace-northwest-recurrence ---")
console.log("detectIssueRecurrence:", recurrence)

if (!recurrence.matched) throw new Error("Expected recurrence.matched === true")
if (recurrence.issue !== "vegetation") throw new Error(`Expected issue vegetation, got ${recurrence.issue}`)
if (Math.abs(recurrence.daysAgo - 11) > 1) {
  throw new Error(`Expected daysAgo ~11, got ${recurrence.daysAgo}`)
}

const out = await mockAnalyzePastureCheck("walk_through", demoNote, "Northwest Pasture", pastureCtx)
console.log("\nmockAnalyzePastureCheck:", {
  riskLevel: out.riskLevel,
  riskLabel: out.riskLabel,
  patternNote: out.patternNote,
  recommendations: out.recommendations,
})

const pn = out.patternNote ?? ""
if (!pn.toLowerCase().includes("south end")) {
  throw new Error("patternNote should mention south end")
}
if (!/\bexpanding\b/i.test(pn)) {
  throw new Error("patternNote should include state verb from note (expanding)")
}
if (!/without grazing pressure to explain it/i.test(pn)) {
  throw new Error("patternNote should include cause framing from demo note")
}
if (!/\b11-day-ago\b/.test(pn)) {
  throw new Error(`patternNote should include 11-day-ago phrase, got: ${pn.slice(0, 120)}`)
}
if (!out.recommendations.some((r) => r.toLowerCase().includes("calving cohort"))) {
  throw new Error("recommendations should mention calving cohort")
}

console.log("\n✓ All assertions passed.")
