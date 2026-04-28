import { PASTURE_CHECK_CATEGORY_LABELS, type PastureCheckCategory } from "@/lib/pastureCheckTypes"
import type { AIResult, Category } from "@/types/observation"

export const ANALYZE_DELAY_MS = 1400

/**
 * Placeholder AI — swap internals for Anthropic (or other) API later.
 * Keep this signature stable: (category, notes, animalName) -> AIResult
 */
export async function mockAnalyze(
  category: Category,
  notes: string,
  animalName: string
): Promise<AIResult> {
  await new Promise((r) => setTimeout(r, ANALYZE_DELAY_MS))
  const lower = notes.toLowerCase()
  if (
    lower.includes("lethargic") ||
    lower.includes("not eating") ||
    lower.includes("cough") ||
    lower.includes("abscess") ||
    lower.includes("wound") ||
    lower.includes("swollen") ||
    lower.includes("bleeding") ||
    lower.includes("limping") ||
    lower.includes("lameness") ||
    lower.includes("fever") ||
    lower.includes("discharge") ||
    lower.includes("injury") ||
    lower.includes("fracture") ||
    lower.includes("seizure") ||
    lower.includes("collapse") ||
    lower.includes("unable to stand") ||
    lower.includes("labored breathing") ||
    lower.includes("purulent")
  ) {
    return {
      riskLevel: "call-vet",
      riskLabel: "Call vet",
      recommendations: [
        "Contact your veterinarian today with this observation and any vitals you have.",
        "Separate the horse from aggressive herdmates if injury or exhaustion is a concern.",
        "Withhold strenuous work until cleared; offer water and familiar forage.",
      ],
      patternNote: `This entry reads like an urgent health concern for ${animalName}. Escalate quickly if symptoms worsen or spread.`,
    }
  }
  if (
    lower.includes("fair") ||
    lower.includes("dry") ||
    lower.includes("skin") ||
    lower.includes("reduced appetite") ||
    lower.includes("eating less") ||
    lower.includes("slightly off") ||
    lower.includes("dull coat") ||
    lower.includes("weight loss") ||
    lower.includes("mild") ||
    lower.includes("slight") ||
    lower.includes("stiff") ||
    lower.includes("sore") ||
    lower.includes("tender")
  ) {
    return {
      riskLevel: "monitor",
      riskLabel: "Monitor",
      recommendations: [
        "Check hydration levels and ensure fresh water access in current pasture.",
        "Observe appetite over next 48 hours — reduced intake may warrant vet consult.",
        "Inspect skin condition; consider adding omega supplement if dryness persists.",
      ],
      patternNote: `Keywords suggest a watch-level health pattern for ${animalName} (appetite or skin). Recheck in 48 hours and escalate if it persists.`,
    }
  }
  return {
    riskLevel: "good",
    riskLabel: "No action needed",
    recommendations: [
      "Continue routine observation; log any appetite, manure, or behavior changes.",
      `Note ${category.toLowerCase()} context on the next check so trends stay visible.`,
    ],
    patternNote: null,
  }
}

/** Placeholder AI for pasture checks — same `AIResult` shape as animal observations. */
export async function mockAnalyzePastureCheck(
  category: PastureCheckCategory,
  notes: string,
  pastureName: string
): Promise<AIResult> {
  await new Promise((r) => setTimeout(r, ANALYZE_DELAY_MS))
  const lower = notes.toLowerCase()
  if (
    lower.includes("broken") ||
    lower.includes("snapped") ||
    lower.includes("down") ||
    lower.includes("no water") ||
    lower.includes("empty tank") ||
    lower.includes("escaped") ||
    lower.includes("leaning post") ||
    lower.includes("needs reset") ||
    lower.includes("urgent")
  ) {
    return {
      riskLevel: "call-vet",
      riskLabel: "Action needed",
      recommendations: [
        "Secure the perimeter before moving animals; flag the repair to your fence contractor or crew.",
        "Photograph the damage for records and re-check voltage after any fix.",
        "If water is compromised, offer alternate trough access today.",
      ],
      patternNote: `${pastureName}: infrastructure note reads urgent — prioritize walk-through after repair.`,
    }
  }
  if (
    lower.includes("rutting") ||
    lower.includes("erosion") ||
    lower.includes("gully") ||
    lower.includes("muddy") ||
    lower.includes("standing water") ||
    lower.includes("rub") ||
    lower.includes("monitor") ||
    lower.includes("concern") ||
    lower.includes("leaning oak")
  ) {
    return {
      riskLevel: "monitor",
      riskLabel: "Concern",
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
    riskLabel: "Stable",
    recommendations: [
      "Keep logging drive-bys and walk-throughs on a steady cadence.",
      `Routine ${PASTURE_CHECK_CATEGORY_LABELS[category].toLowerCase()} looks adequate for now.`,
      "If weather shifts, re-check water levels and fence tension the same week.",
    ],
    patternNote: null,
  }
}
