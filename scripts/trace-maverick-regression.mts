/**
 * Pattern E (Maverick regression) — trace without dev server.
 * Run: npx tsx --tsconfig tsconfig.trace.json scripts/trace-maverick-regression.mts
 */
import { observationDomainFromCategory } from "../src/lib/observationDomain"
import { seedDaysAgo } from "../src/lib/observationSeedDates"
import { mockAnalyze } from "../src/lib/observationAnalyze"
import { mockAnalyzeBehavior } from "../src/lib/observationAnalyzeBehavior"
import { entriesToRecentSnapshots, type EntityContext } from "../src/lib/observationAnalyzeContext"
import type { ObservationEntry } from "../src/types/observation"
import type { RecentObservationForAnalyze } from "../src/lib/observationAnalyzeContext"

const MS_DAY = 86_400_000
function lower(s: string) {
  return s.toLowerCase()
}
function withinLastDays(obs: RecentObservationForAnalyze, days: number, now: Date): boolean {
  return now.getTime() - obs.loggedAt.getTime() <= days * MS_DAY
}
function hasResistanceMarkers(l: string): boolean {
  return (
    l.includes("raised head") ||
    l.includes("pulled back") ||
    l.includes("refused") ||
    l.includes("tense throughout") ||
    l.includes("resistance") ||
    l.includes("wouldn't pick") ||
    l.includes("didn't want to pick") ||
    l.includes("would not pick")
  )
}
function notesMentionHalterWork(l: string): boolean {
  return (
    l.includes("halter") ||
    l.includes("haltered") ||
    l.includes("groom") ||
    l.includes("feet") ||
    l.includes("foot") ||
    l.includes("cross-tie") ||
    l.includes("cross tie")
  )
}
function priorHadCleanHalterSession(l: string): boolean {
  return (
    (l.includes("halter") || l.includes("haltered")) &&
    (l.includes("without resistance") || l.includes("calm") || l.includes("quietly")) &&
    (l.includes("groom") || l.includes("feet") || l.includes("led"))
  )
}

const maverickPrior: ObservationEntry = {
  id: "sup-maverick-demo-regression-prior",
  date: seedDaysAgo(6),
  category: "Behavior",
  observationDomain: observationDomainFromCategory("Behavior"),
  notes:
    "Haltered without resistance, led from stall to cross-tie cleanly. Stood quietly through grooming including face brushing and feet picking. Calm throughout.",
  loggedBy: "Juniper",
  aiResult: {
    riskLevel: "good",
    riskLabel: "Good",
    patternNote:
      "Solid baseline session for Maverick. Haltering, leading, grooming, and feet all in one calm session — that's a stack worth noting as the reference point.",
    recommendations: [
      "Vary context next session — same sequence somewhere different.",
      "Note this baseline so future shifts are easier to catch.",
    ],
  },
}

const demoNote =
  "Tried to halter Maverick this morning, raised head and pulled back when I went for the crownpiece. Got the halter on after a few tries but he was tense throughout grooming, kept shifting weight on the right hind, didn't want to pick that foot up."

const horseCtx: EntityContext = {
  entityKind: "horse",
  entityId: "maverick",
  entityName: "Maverick",
  recentObservations: entriesToRecentSnapshots([maverickPrior]),
}

console.log("--- Maverick / Pattern E trace ---")
console.log("prior date:", maverickPrior.date, "riskLevel:", maverickPrior.aiResult?.riskLevel)
console.log("recentObservations length:", horseCtx.recentObservations.length)
console.log("entityKind:", horseCtx.entityKind)

const now = new Date()
const l = lower(demoNote)
const priorBehaviors = horseCtx.recentObservations.filter(
  (o) => String(o.category).toLowerCase() === "behavior" && withinLastDays(o, 14, now)
)
const priorGood = priorBehaviors.find(
  (o) => o.riskLevel === "good" && priorHadCleanHalterSession(lower(o.notes))
)
const rhCue =
  l.includes("right hind") ||
  (l.includes("right") && l.includes("hind")) ||
  l.includes("that foot") ||
  l.includes("same side")
const rhBlock = rhCue && (l.includes("weight") || l.includes("foot") || l.includes("pick"))

console.log("\nPattern E detector mirror (same logic as observationAnalyzeBehavior):", {
  priorBehaviors14d: priorBehaviors.length,
  hasResistanceMarkers: hasResistanceMarkers(l),
  notesMentionHalterWork: notesMentionHalterWork(l),
  priorGoodFound: Boolean(priorGood),
  priorGoodRiskLevel: priorGood?.riskLevel,
  rhCue,
  rhSpecificBlock: rhBlock,
  patternEOuterGate:
    priorBehaviors.length > 0 && hasResistanceMarkers(l) && notesMentionHalterWork(l),
})

const behaviorOut = await mockAnalyzeBehavior(demoNote, "Maverick", horseCtx)
console.log("\nmockAnalyzeBehavior (Pattern path):", {
  riskLevel: behaviorOut.riskLevel,
  patternNotePreview: behaviorOut.patternNote?.slice(0, 120),
  rec0: behaviorOut.recommendations[0]?.slice(0, 80),
})

const healthOut = await mockAnalyze("Health", demoNote, "Maverick", horseCtx)
console.log("\nmockAnalyze(Health, ...) — simulates wrong category:", {
  riskLevel: healthOut.riskLevel,
  patternNote: healthOut.patternNote,
  rec0: healthOut.recommendations[0],
})

const behaviorRouter = await mockAnalyze("Behavior", demoNote, "Maverick", horseCtx)
console.log("\nmockAnalyze(Behavior, ...) — correct category:", {
  riskLevel: behaviorRouter.riskLevel,
  patternNotePreview: behaviorRouter.patternNote?.slice(0, 120),
})
