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
      patternNote: `${animalName} had a similar health-related note in recent logs — escalate if symptoms worsen.`,
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
      patternNote: `${animalName} had a similar health observation before — appetite and skin noted then too. If this persists, escalate to vet.`,
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
