import {
  buildCowPriorHistoryStringFromFields,
  generateDystociaObservationAiResult,
  matchesCattleDystociaObservationScenario,
} from "@/lib/cattleDystociaObservationAi"
import type { EntityContext } from "@/lib/observationAnalyzeContext"
import type { AIResult, Category } from "@/types/observation"

function lower(notes: string) {
  return notes.toLowerCase()
}

/**
 * Health-only analyzer (horse + cattle health-style observations).
 * Calving *observation* rows can share this path when category is not Behavior.
 */
export async function mockAnalyzeHealth(
  _category: Category,
  notes: string,
  animalName: string,
  context?: EntityContext
): Promise<AIResult> {
  if (context?.entityKind === "cattle" && matchesCattleDystociaObservationScenario(notes)) {
    const prior = buildCowPriorHistoryStringFromFields(context.cattleCalvingSnapshot ?? {}).trim()
    return generateDystociaObservationAiResult(animalName, prior)
  }

  const l = lower(notes)

  const lamenessCluster =
    l.includes("limping") ||
    l.includes("lameness") ||
    l.includes("non-weight-bearing") ||
    l.includes("non weight bearing") ||
    l.includes("off leg") ||
    l.includes("head bob")

  const woundCluster =
    l.includes("wound") || l.includes("laceration") || l.includes("bleeding") || l.includes("cut ")
  const systemicCluster =
    l.includes("fever") ||
    l.includes("labored breathing") ||
    l.includes("collapse") ||
    l.includes("unable to stand") ||
    l.includes("seizure") ||
    l.includes("purulent")

  const acuteInjury =
    l.includes("injury") ||
    l.includes("fracture") ||
    l.includes("abscess") ||
    lamenessCluster ||
    woundCluster

  if (acuteInjury || systemicCluster || l.includes("lethargic") || l.includes("not eating")) {
    if (lamenessCluster || (l.includes("limping") && (l.includes("heat") || l.includes("swell")))) {
      return {
        riskLevel: "flag",
        riskLabel: "Flag",
        patternNote: `${animalName} is showing acute injury markers. Where this lands depends on what you're seeing — heat and swelling with weight-bearing reluctance reads differently than a clean wound or a sudden non-weight-bearing lameness.`,
        recommendations: [
          "Check for heat, swelling, and weight-bearing — those three together usually tell you whether this is rest-and-watch or vet-territory.",
          "If it's grade 3+ lameness or non-weight-bearing, vet's the call.",
          "Document what you're seeing so the trend across the next 24 hours is traceable — sometimes acute presents worse than it ends up being, sometimes the reverse.",
        ],
      }
    }
    if (woundCluster) {
      return {
        riskLevel: "flag",
        riskLabel: "Flag",
        patternNote: `Acute wound on ${animalName}. Most superficial wounds are handle-it — depth, location, and bleeding pattern are the variables that change the call.`,
        recommendations: [
          "Clean it, assess depth, and check for foreign material.",
          "If it's near a joint, deep enough to see structure, or won't stop bleeding with pressure, that's vet territory.",
          "Tetanus status is worth confirming if it's been a while.",
        ],
      }
    }
    if (systemicCluster || l.includes("lethargic") || l.includes("not eating")) {
      return {
        riskLevel: "flag",
        riskLabel: "Flag",
        patternNote: `Systemic signs on ${animalName}. This isn't usually rest-and-watch — vital signs at this level point to something needing intervention beyond what's typically stocked on hand.`,
        recommendations: [
          "Take temp, pulse, respiratory rate, and capillary refill if you haven't.",
          "If temp is over 102.5°F or breathing's labored at rest, vet call earns its keep — this is the territory where access to prescription meds and IV fluids matters.",
          "Note time of onset and any recent feed, environment, or contact changes.",
        ],
      }
    }
    return {
      riskLevel: "flag",
      riskLabel: "Flag",
      patternNote: `${animalName} is showing acute injury markers. Where this lands depends on what you're seeing — heat and swelling with weight-bearing reluctance reads differently than a clean wound or a sudden non-weight-bearing lameness.`,
      recommendations: [
        "Check for heat, swelling, and weight-bearing — those three together usually tell you whether this is rest-and-watch or vet-territory.",
        "If it's grade 3+ lameness or non-weight-bearing, vet's the call.",
        "Document what you're seeing so the trend across the next 24 hours is traceable — sometimes acute presents worse than it ends up being, sometimes the reverse.",
      ],
    }
  }

  if (
    l.includes("cough") ||
    l.includes("discharge") ||
    l.includes("swollen") ||
    l.includes("fair") ||
    l.includes("dry") ||
    l.includes("skin") ||
    l.includes("reduced appetite") ||
    l.includes("eating less") ||
    l.includes("slightly off") ||
    l.includes("dull coat") ||
    l.includes("weight loss") ||
    l.includes("mild") ||
    l.includes("slight") ||
    l.includes("stiff") ||
    l.includes("sore") ||
    l.includes("tender")
  ) {
    return {
      riskLevel: "monitor",
      riskLabel: "Monitor",
      patternNote: `Watch-level signs on ${animalName} — not urgent, but worth tracking to see if this stays mild or develops into something else.`,
      recommendations: [
        "Recheck in 48 hours and note whether it's holding, improving, or progressing.",
        "If appetite drop continues past two days or skin condition worsens, that's when it's worth getting a closer look.",
        "Hydration check is cheap and quick — skin tent and capillary refill tell you a lot.",
      ],
    }
  }

  return {
    riskLevel: "good",
    riskLabel: "Good",
    recommendations: [
      "Continue routine observation; log any appetite, manure, or behavior changes.",
      `Note ${_category.toLowerCase()} context on the next check so trends stay visible.`,
    ],
    patternNote: null,
  }
}
