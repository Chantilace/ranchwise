import { ANALYZE_DELAY_MS } from "@/lib/observationAnalyze"
import {
  buildCalvingObservationNotes,
  formatCalfStatusLabel,
  formatComplicationsSummary,
  formatDeliveryTypeLabel,
} from "@/lib/calvingStatus"
import {
  buildCowPriorHistoryString,
  generateDystociaObservationAiResult,
  matchesCattleDystociaObservationScenario,
} from "@/lib/cattleDystociaObservationAi"
import { formatCattleTagDisplay } from "@/lib/cattleUi"
import type { CalvingRecord, Cattle } from "@/types/cattle"
import type { AIResult, RiskLevel } from "@/types/observation"

const CALVING_SYSTEM_PROMPT =
  "You are a ranch management assistant. A calving event has just been recorded. Based on the calving details provided, give 2-3 brief, actionable follow-up recommendations. Be specific and practical. Focus on immediate next steps for the rancher."

/** Pasture-check style labels used in the calving "Confirm status" UI. */
export function calvingOutcomeConfirmationLabel(level: RiskLevel): string {
  if (level === "flag") return "Flag"
  if (level === "monitor") return "Monitor"
  return "Good"
}

const RISK_ORDER: Record<RiskLevel, number> = { flag: 2, monitor: 1, good: 0 }

function maxRisk(a: RiskLevel, b: RiskLevel): RiskLevel {
  return RISK_ORDER[a] >= RISK_ORDER[b] ? a : b
}

function riskFromCalving(record: CalvingRecord): { riskLevel: RiskLevel; riskLabel: string } {
  const comps = record.complications ?? []
  if (comps.includes("hemorrhage") || comps.includes("prolapse")) {
    return { riskLevel: "flag", riskLabel: calvingOutcomeConfirmationLabel("flag") }
  }
  if (record.calfStatus === "stillborn") {
    return { riskLevel: "flag", riskLabel: calvingOutcomeConfirmationLabel("flag") }
  }
  if (comps.some((c) => c !== "none")) {
    return { riskLevel: "monitor", riskLabel: calvingOutcomeConfirmationLabel("monitor") }
  }
  return { riskLevel: "good", riskLabel: calvingOutcomeConfirmationLabel("good") }
}

function keywordCalvingRisk(text: string): RiskLevel | null {
  const t = text.toLowerCase()
  const actionPhrases = [
    "dystocia",
    "retained placenta",
    "stillborn",
    "won't stand",
    "wont stand",
    "not standing",
    "milk fever",
    "hemorrhage",
    "heavy bleeding",
    "prolapse",
  ]
  const concernPhrases = [
    "weak",
    "delayed",
    "abnormal positioning",
    "longer than expected",
    "slow to rise",
    "lethargic",
    "took longer",
  ]
  const stablePhrases = [
    "without complications",
    "no complications",
    "calf alert",
    "standing well",
    "mother cleaning",
    "nursing well",
    "nursing strong",
    "normal delivery",
    "uncomplicated",
    "delivered without",
  ]
  for (const p of actionPhrases) {
    if (t.includes(p)) return "flag"
  }
  for (const p of concernPhrases) {
    if (t.includes(p)) return "monitor"
  }
  for (const p of stablePhrases) {
    if (t.includes(p)) return "good"
  }
  return null
}

/** Combines structured calving fields + free-text cues for canned AI status (Good / Monitor / Flag). */
export function suggestCalvingObservationRisk(record: CalvingRecord): RiskLevel {
  const structural = riskFromCalving(record).riskLevel
  const realComps = (record.complications ?? []).filter((c) => c !== "none")
  const notesBlob = [
    record.notes ?? "",
    buildCalvingObservationNotes({
      ...record,
      complications: realComps.length > 0 ? realComps : [],
    }),
  ].join(" ")
  const kw = keywordCalvingRisk(notesBlob)
  if (kw === null) return structural
  return maxRisk(structural, kw)
}

/**
 * Placeholder AI for calving follow-ups — mirrors `mockAnalyze` timing/signature style.
 * Swap internals for Anthropic (or other) API later.
 */
export async function analyzeCalvingRecord(cattle: Cattle, pastureName: string, record: CalvingRecord): Promise<AIResult> {
  await new Promise((r) => setTimeout(r, ANALYZE_DELAY_MS))

  const delivery = formatDeliveryTypeLabel(record.deliveryType)
  const calf = formatCalfStatusLabel(record.calfStatus)
  const compSummary = formatComplicationsSummary(record.complications ?? [])

  const historyBits = [
    `Calving status (pre-save): ${cattle.calvingStatus}`,
    cattle.dueDate ? `Due date (if applicable): ${cattle.dueDate}` : null,
    cattle.healthStatus ? `Health status: ${cattle.healthStatus}` : null,
    pastureName ? `Pasture: ${pastureName}` : null,
  ]
    .filter(Boolean)
    .join(" · ")

  const userPayload = {
    system: CALVING_SYSTEM_PROMPT,
    cowTag: formatCattleTagDisplay(cattle.tagNumber),
    calving: {
      dateIso: record.date,
      deliveryType: record.deliveryType,
      deliveryLabel: delivery,
      calfStatus: record.calfStatus,
      calfLabel: calf,
      complications: record.complications ?? [],
      complicationsSummary: compSummary,
      notes: record.notes ?? "",
      loggedBy: record.loggedBy,
    },
    cattleRecordSummary: historyBits,
  }

  void userPayload

  const notesBlob = [record.notes ?? "", buildCalvingObservationNotes(record)].join(" ")

  if (matchesCattleDystociaObservationScenario(notesBlob)) {
    const prior = buildCowPriorHistoryString(cattle).trim()
    return generateDystociaObservationAiResult(formatCattleTagDisplay(cattle.tagNumber), prior)
  }

  const riskLevel = suggestCalvingObservationRisk(record)
  const riskLabel = calvingOutcomeConfirmationLabel(riskLevel)

  if (riskLevel === "flag") {
    return {
      riskLevel,
      riskLabel,
      recommendations: [
        "If you're concerned about blood loss, placenta timing, or how hard she's pushing, a vet on the phone with times and vitals usually earns its keep fast.",
        "Keep the cow quiet with water nearby; hold off on pulling or manipulating tissue until you have a plan you're confident in.",
        "Note any changes every 15–30 minutes so the trend's documented if someone else has to take over.",
      ],
      patternNote:
        "High-risk complications were flagged on this record — worth a close read on dam and calf for the next day, and clear notes if anything shifts.",
    }
  }

  if (riskLevel === "monitor") {
    return {
      riskLevel,
      riskLabel,
      recommendations: [
        "Monitor dam appetite, attitude, and udder fill every 4–6 hours for 48 hours; log anything abnormal.",
        "Watch for fever, foul discharge, reduced milk letdown, or calf nursing issues.",
        "Recheck calf vigor, suckle strength, and manure; if something drifts, that's when a vet call is the straightforward next step.",
      ],
      patternNote:
        "This calving outcome warrants a closer watch for a day or two — not necessarily alarm bells, but enough signal to keep eyes on dam and calf.",
    }
  }

  return {
    riskLevel,
    riskLabel,
    recommendations: [
      "Confirm calf is nursing well within the first few hours; supplement if needed per your vet protocol.",
      "Verify placenta passage within the window you run on; note time if uncertain.",
      "Routine post-calving check (temperature + udder + feet) in the next 24–48 hours fits most operations.",
    ],
    patternNote: null,
  }
}
