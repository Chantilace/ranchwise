import { PASTURE_CHECK_CATEGORY_LABELS, type PastureCheckCategory } from "@/lib/pastureCheckTypes"
import {
  OBSERVATION_ANALYZE_DELAY_MS,
  daysSince,
  type EntityContext,
  type RecentObservationForAnalyze,
} from "@/lib/observationAnalyzeContext"
import type { AIResult, RiskLevel } from "@/types/observation"

function lower(s: string) {
  return s.toLowerCase()
}

export type IssueFamily = "vegetation" | "fence" | "water" | "animal_welfare" | "predator"

const ISSUE_FAMILY_ORDER: IssueFamily[] = [
  "vegetation",
  "fence",
  "water",
  "animal_welfare",
  "predator",
]

const ISSUE_KEYWORDS: Record<IssueFamily, readonly string[]> = {
  vegetation: [
    "bare patch",
    "bare patches",
    "ground cover",
    "thin cover",
    "overgrazed",
    "regrowth",
    "recovery",
  ],
  fence: ["fence", "wire", "post", "gate", "perimeter"],
  water: ["trough", "water source", "water level", "spring", "tank", "waterer"],
  animal_welfare: ["body condition", "limping", "lame", "isolated", "aggressive"],
  predator: ["predator", "tracks", "scat", "kill site", "carcass", "missing"],
}

export type PastureRecurrencePrior = {
  notes: string
  loggedAtMs: number
  riskLevel: RiskLevel
  riskLabel: string
}

export type IssueRecurrenceResult =
  | {
      matched: true
      issue: IssueFamily
      priorCheckIndex: number
      daysAgo: number
      priorRiskLabel: string
    }
  | { matched: false }

function textMatchesFamily(text: string, family: IssueFamily): boolean {
  const t = lower(text)
  return ISSUE_KEYWORDS[family].some((kw) => t.includes(kw))
}

function extractIssueFamiliesFromNote(note: string): IssueFamily[] {
  const l = lower(note)
  return ISSUE_FAMILY_ORDER.filter((f) => textMatchesFamily(l, f))
}

/**
 * Detects when today's note continues an issue class that already appeared on a prior
 * check that was elevated (monitor / flag). Does not match against clean (good) priors.
 */
export function detectIssueRecurrence(
  currentNote: string,
  recentChecks: PastureRecurrencePrior[]
): IssueRecurrenceResult {
  const familiesInCurrent = extractIssueFamiliesFromNote(currentNote)
  if (familiesInCurrent.length === 0 || recentChecks.length === 0) {
    return { matched: false }
  }

  const sortedAsc = [...recentChecks].sort((a, b) => a.loggedAtMs - b.loggedAtMs)
  const sortedNewestFirst = [...sortedAsc].reverse()

  for (const family of familiesInCurrent) {
    for (const prior of sortedNewestFirst) {
      if (prior.riskLevel !== "monitor" && prior.riskLevel !== "flag") continue
      if (!textMatchesFamily(prior.notes, family)) continue

      const priorCheckIndex = sortedAsc.findIndex(
        (p) => p.loggedAtMs === prior.loggedAtMs && p.notes === prior.notes
      )
      const daysAgo = daysSince(new Date(prior.loggedAtMs), new Date())

      return {
        matched: true,
        issue: family,
        priorCheckIndex: priorCheckIndex >= 0 ? priorCheckIndex : 0,
        daysAgo,
        priorRiskLabel: prior.riskLabel,
      }
    }
  }

  return { matched: false }
}

export function snapshotsToRecurrencePriors(snapshots: RecentObservationForAnalyze[]): PastureRecurrencePrior[] {
  return snapshots.map((s) => ({
    notes: s.notes,
    loggedAtMs: s.loggedAt.getTime(),
    riskLevel: s.riskLevel,
    riskLabel: s.riskLabel,
  }))
}

/** Parses location hints from the current note for vegetation recurrence copy (demo nuance). */
function parseVegetationLocationSuffix(l: string): string {
  if (/\bsouth end\b/i.test(l)) return " at the south end"
  if (/\bnorth end\b/i.test(l)) return " at the north end"
  if (/lower paddock/i.test(l)) return " in the lower paddock"
  if (/\bridgeline\b/i.test(l)) return " along the ridgeline"
  if (/\bnortheast\b/i.test(l)) return " in the northeast"
  if (/\bnorthwest\b/i.test(l)) return " in the northwest"
  if (/\bsoutheast\b/i.test(l)) return " in the southeast"
  if (/\bsouthwest\b/i.test(l)) return " in the southwest"
  if (/\beast\b/i.test(l)) return " on the east side"
  if (/\bwest\b/i.test(l)) return " on the west side"
  return ""
}

/** First matching state phrase for vegetation recurrence; default when nothing matches. */
function parseVegetationStateVerb(l: string): string {
  if (/\bexpanding\b|\bexpanded\b/i.test(l)) return "expanding"
  if (/\bholding\b|\bheld\b/i.test(l)) return "holding"
  if (/\bworsening\b|\bworsen(ed|ing)?\b/i.test(l)) return "worsening"
  if (/\bspreading\b|\bspread(ing)?\b/i.test(l)) return "spreading"
  if (/\bpersisting\b|\bpersist(s|ed|ent)?\b/i.test(l)) return "persisting"
  if (/not recovering/i.test(l)) return "not recovering"
  if (/recovery isn't|recovery isnt|isn't keeping pace|isnt keeping pace|not keeping pace/i.test(l)) {
    return "not recovering"
  }
  return "still present"
}

/** Optional cause clause after the state verb; empty when nothing maps cleanly. */
function parseVegetationCauseFraming(l: string): string {
  if (/no new grazing pressure|without grazing pressure|grazing pressure.*explain|nothing to explain/i.test(l)) {
    return "without grazing pressure to explain it"
  }
  if (/despite\s+(the\s+)?rain|after\s+(the\s+)?rain|recent rain/i.test(l)) {
    return "despite recent rain"
  }
  if (/seasonal stress|dry season|in line with seasonal/i.test(l)) {
    return "in line with seasonal stress"
  }
  return ""
}

function otherOperationalCategoriesStatus(l: string): string {
  const fenceOk =
    (l.includes("fence") && (l.includes("intact") || l.includes("tight") || l.includes("good"))) ||
    l.includes("fence intact")
  const waterOk =
    (l.includes("trough") && l.includes("clean")) ||
    (l.includes("water") && (l.includes("good") || l.includes("clean") || l.includes("strong"))) ||
    l.includes("waterers visible") ||
    l.includes("trough clean")

  if (fenceOk && waterOk) {
    return "Fence, water, and overall operational checks have been steady"
  }
  if (fenceOk) {
    return "Fence and perimeter checks have been steady"
  }
  if (waterOk) {
    return "Water and trough checks have been steady"
  }
  return "Other operational categories have read steady lately"
}

const FAMILY_DISPLAY: Record<IssueFamily, string> = {
  vegetation: "vegetation",
  fence: "fence",
  water: "water",
  animal_welfare: "animal welfare",
  predator: "predator",
}

function recurrencePatternNote(
  pastureName: string,
  recurrence: Extract<IssueRecurrenceResult, { matched: true }>,
  currentLower: string,
  otherCategoriesStatus: string
): string {
  const d = recurrence.daysAgo

  if (recurrence.issue === "vegetation") {
    const locationSuffix = parseVegetationLocationSuffix(currentLower)
    const stateVerb = parseVegetationStateVerb(currentLower)
    const causeFraming = parseVegetationCauseFraming(currentLower)
    const causePart = causeFraming ? ` ${causeFraming}` : ""
    return `Bare patches${locationSuffix} were also the watch item on the ${d}-day-ago check. Today's note shows them ${stateVerb}${causePart} — which is the read that matters. ${otherCategoriesStatus}, so this is a localized vegetation issue holding on rather than something systemic.`
  }

  const familyLabel = FAMILY_DISPLAY[recurrence.issue]
  return `On ${pastureName}, the same ${familyLabel} concern was also flagged on the ${d}-day-ago check (${recurrence.priorRiskLabel}). Today's note shows the issue still present — which is the read that matters. ${otherCategoriesStatus}, so this reads as a localized ${familyLabel} issue rather than something systemic.`
}

const VEGETATION_RECURRENCE_RECS: readonly string[] = [
  "Move the calving cohort east to give the south end 30+ days of rest before the dry season window closes — that's the window where rotation actually buys you something.",
  "Photograph the bare patch coverage today as a baseline. If the next check shows the same coverage or worse despite reduced grazing pressure, that's when you'd want to look at soil condition or seed bank.",
  "Other operational checks have been clean — no need to escalate the whole inspection cadence, just track the south end specifically.",
]

const GENERIC_RECURRENCE_RECS: readonly string[] = [
  "Tackle the recurring issue before it pulls other operational categories with it — use the same focal area the prior elevated check called out.",
  "Document today's conditions (photo or short map note) so the next pass compares apples to apples.",
  "Other operational checks have been steady — narrow follow-up to this category rather than increasing the whole-pasture cadence.",
]

function barePatchReadsAsProblem(l: string): boolean {
  if (!l.includes("bare patch") && !l.includes("bare patches")) return false
  if (l.includes("minimal bare") || l.includes("few bare")) return false
  return (
    l.includes("expanded") ||
    l.includes("expanding") ||
    l.includes("more bare") ||
    l.includes("worse") ||
    l.includes("not keeping") ||
    l.includes("isn't keeping") ||
    l.includes("isnt keeping") ||
    l.includes("starting at") ||
    l.includes("scattered bare")
  )
}

function isOperationallyCleanNote(l: string): boolean {
  if (
    l.includes("broken") ||
    l.includes("escaped") ||
    l.includes("no water") ||
    l.includes("empty tank") ||
    l.includes("erosion") ||
    l.includes("gully") ||
    l.includes("predator") ||
    l.includes("lame") ||
    l.includes("limping") ||
    l.includes("worsening") ||
    barePatchReadsAsProblem(l)
  ) {
    return false
  }

  const positiveFence = l.includes("fence") && (l.includes("intact") || l.includes("tight") || l.includes("good"))
  const positiveWater =
    (l.includes("trough") && l.includes("clean")) ||
    (l.includes("water") && (l.includes("good") || l.includes("full") || l.includes("clean") || l.includes("strong"))) ||
    l.includes("waterers visible")
  const spreadOk = l.includes("spread") || l.includes("evenly") || l.includes("not bunched")

  return (positiveFence && positiveWater) || (positiveWater && spreadOk) || (positiveFence && spreadOk)
}

/** Optional: caller may pass prior-only context via `buildEntityContextFromCommitMeta` first. */
export async function mockAnalyzePastureCheck(
  category: PastureCheckCategory,
  notes: string,
  pastureName: string,
  context?: EntityContext
): Promise<AIResult> {
  await new Promise((r) => setTimeout(r, OBSERVATION_ANALYZE_DELAY_MS))
  const l = lower(notes)

  const priors = context?.entityKind === "pasture" ? snapshotsToRecurrencePriors(context.recentObservations ?? []) : []
  const recurrence = detectIssueRecurrence(notes, priors)

  if (
    l.includes("broken") ||
    l.includes("snapped") ||
    l.includes("no water") ||
    l.includes("empty tank") ||
    l.includes("escaped") ||
    l.includes("leaning post") ||
    l.includes("needs reset") ||
    (l.includes("urgent") && !l.includes("not urgent"))
  ) {
    return {
      riskLevel: "flag",
      riskLabel: "Flag",
      recommendations: [
        "Secure the perimeter before moving animals; flag the repair to your fence contractor or crew.",
        "Photograph the damage for records and re-check voltage after any fix.",
        "If water is compromised, alternate trough access is worth sorting same-day.",
      ],
      patternNote: `${pastureName}: infrastructure note reads urgent — prioritize walk-through after repair.`,
    }
  }

  if (recurrence.matched) {
    const otherCat = otherOperationalCategoriesStatus(l)
    const recs =
      recurrence.issue === "vegetation" ? [...VEGETATION_RECURRENCE_RECS] : [...GENERIC_RECURRENCE_RECS]
    return {
      riskLevel: "monitor",
      riskLabel: "Monitor",
      patternNote: recurrencePatternNote(pastureName, recurrence, l, otherCat),
      recommendations: recs,
    }
  }

  const families = extractIssueFamiliesFromNote(notes)
  if (families.length > 0 && !isOperationallyCleanNote(l)) {
    const fam = families[0]!
    return {
      riskLevel: "monitor",
      riskLabel: "Monitor",
      patternNote: `New ${FAMILY_DISPLAY[fam]} concern flagged on ${pastureName}. Recent checks have been steady on other categories, so this is a fresh issue rather than a developing pattern. Worth tracking specifically.`,
      recommendations: [
        "Document baseline state today (photograph if applicable) so the next check has something to compare against.",
        "Check whether recent conditions (weather, grazing pressure, handler activity) could explain the shift before assuming this is a longer-term pattern.",
        "Recheck within 7 days specifically focused on the issue — if it's persisting or expanding, that's when intervention becomes the next decision.",
      ],
    }
  }

  if (isOperationallyCleanNote(l)) {
    return {
      riskLevel: "good",
      riskLabel: "Good",
      patternNote: `Clean walk-through on ${pastureName}.`,
      recommendations: ["Continue rotation schedule as planned."],
    }
  }

  if (
    l.includes("rutting") ||
    l.includes("erosion") ||
    l.includes("gully") ||
    l.includes("muddy") ||
    l.includes("standing water") ||
    l.includes("rub") ||
    l.includes("leaning oak")
  ) {
    return {
      riskLevel: "monitor",
      riskLabel: "Monitor",
      recommendations: [
        "Schedule a follow-up walk-through after the next rain event.",
        "Consider drainage, gravel at gates, or reseeding bare spots before they widen.",
        "Note category " + PASTURE_CHECK_CATEGORY_LABELS[category] + " on the next drive-by for trend tracking.",
      ],
      patternNote: `${pastureName} had similar footing or water notes before — compare photos if you have them.`,
    }
  }

  return {
    riskLevel: "good",
    riskLabel: "Good",
    recommendations: [
      "Keep logging drive-bys and walk-throughs on a steady cadence.",
      `Routine ${PASTURE_CHECK_CATEGORY_LABELS[category].toLowerCase()} looks adequate for now.`,
      "If weather shifts, re-check water levels and fence tension the same week.",
    ],
    patternNote: null,
  }
}
