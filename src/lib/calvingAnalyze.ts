import { ANALYZE_DELAY_MS } from "@/lib/observationAnalyze"
import {
  buildCalvingObservationNotes,
  formatCalfStatusLabel,
  formatComplicationsSummary,
  formatDeliveryTypeLabel,
} from "@/lib/calvingStatus"
import { formatCattleTagDisplay } from "@/lib/cattleUi"
import type { CalvingRecord, Cattle } from "@/types/cattle"
import type { AIResult, RiskLevel } from "@/types/observation"

const CALVING_SYSTEM_PROMPT =
  "You are a ranch management assistant. A calving event has just been recorded. Based on the calving details provided, give 2-3 brief, actionable follow-up recommendations. Be specific and practical. Focus on immediate next steps for the rancher."

/** Pasture-check style labels used in the calving "Confirm status" UI. */
export function calvingOutcomeConfirmationLabel(level: RiskLevel): string {
  if (level === "call-vet") return "Action needed"
  if (level === "monitor") return "Concern"
  return "Stable"
}

const RISK_ORDER: Record<RiskLevel, number> = { "call-vet": 2, monitor: 1, good: 0 }

function maxRisk(a: RiskLevel, b: RiskLevel): RiskLevel {
  return RISK_ORDER[a] >= RISK_ORDER[b] ? a : b
}

function riskFromCalving(record: CalvingRecord): { riskLevel: RiskLevel; riskLabel: string } {
  const comps = record.complications ?? []
  if (comps.includes("hemorrhage") || comps.includes("prolapse")) {
    return { riskLevel: "call-vet", riskLabel: calvingOutcomeConfirmationLabel("call-vet") }
  }
  if (record.calfStatus === "stillborn") {
    return { riskLevel: "call-vet", riskLabel: calvingOutcomeConfirmationLabel("call-vet") }
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
    if (t.includes(p)) return "call-vet"
  }
  for (const p of concernPhrases) {
    if (t.includes(p)) return "monitor"
  }
  for (const p of stablePhrases) {
    if (t.includes(p)) return "good"
  }
  return null
}

/** Combines structured calving fields + free-text cues for canned AI status (Stable / Concern / Action needed). */
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

  // NOTE: In a real integration, send `userPayload` to Anthropic here.
  void userPayload

  const riskLevel = suggestCalvingObservationRisk(record)
  const riskLabel = calvingOutcomeConfirmationLabel(riskLevel)

  if (riskLevel === "call-vet") {
    return {
      riskLevel,
      riskLabel,
      recommendations: [
        "Call your veterinarian now with the calving time, any blood loss estimates, and whether the placenta has passed.",
        "Keep the cow quiet with water nearby; do not pull or manipulate retained tissue unless your vet instructs.",
        "Prepare transport / vet access details and note any changes every 15–30 minutes until help arrives.",
      ],
      patternNote:
        "High-risk calving complications were recorded — prioritize rapid vet involvement and close monitoring for the next 24 hours.",
    }
  }

  if (riskLevel === "monitor") {
    return {
      riskLevel,
      riskLabel,
      recommendations: [
        "Monitor dam appetite, attitude, and udder fill every 4–6 hours for 48 hours; log anything abnormal.",
        "Watch for fever, foul discharge, reduced milk letdown, or calf nursing issues.",
        "Recheck calf vigor, suckle strength, and manure; intervene early if calf looks weak or cold.",
      ],
      patternNote:
        "This calving outcome warrants closer follow-up — complications or calf status suggests extra observation for the next day or two.",
    }
  }

  return {
    riskLevel,
    riskLabel,
    recommendations: [
      "Confirm calf is nursing well within the first few hours; supplement if needed per your vet protocol.",
      "Verify placenta passage within normal window for your operation; note time if uncertain.",
      "Schedule a routine post-calving check (temperature + udder + feet) in the next 24–48 hours.",
    ],
    patternNote: null,
  }
}
