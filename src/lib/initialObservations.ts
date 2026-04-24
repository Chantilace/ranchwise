import type { ActivityLogEntry } from "@/components/HeguyRanchCoPilot"
import { SAMPLE_HORSE_ROWS, horseRowKey } from "@/components/HeguyRanchCoPilot"
import { observationDomainFromCategory } from "@/lib/observationDomain"
import type { AIResult, Category, ObservationEntry, RiskLevel } from "@/types/observation"

function logCategoryToCategory(c: ActivityLogEntry["category"]): Category {
  return (c.charAt(0).toUpperCase() + c.slice(1)) as Category
}

function minnieAiResult(logId: string, log: ActivityLogEntry): AIResult | null {
  switch (logId) {
    case "1":
      return {
        riskLevel: "monitor",
        riskLabel: "Monitor",
        recommendations: log.aiNextSteps ?? [],
        patternNote:
          "Minnie had a similar health observation on 3/26 — appetite and skin noted then too. If this persists, escalate to vet.",
      }
    case "2":
      return {
        riskLevel: "call-vet",
        riskLabel: "Call vet",
        recommendations: log.aiNextSteps ?? [],
        patternNote:
          "Withdrawal and repeated avoidance may indicate sustained herd pressure; coordinate with vet if lethargy continues.",
      }
    case "3":
      return {
        riskLevel: "good",
        riskLabel: "No action needed",
        recommendations:
          log.aiNextSteps && log.aiNextSteps.length > 0
            ? log.aiNextSteps
            : ["Continue soft feed if needed and monitor chewing comfort."],
        patternNote: null,
      }
    case "4":
      return {
        riskLevel: "good",
        riskLabel: "No action needed",
        recommendations: log.aiNextSteps ?? [],
        patternNote: null,
      }
    default:
      return null
  }
}

/**
 * Infers AI risk level from observation log content.
 * Used for logs that have aiNextSteps but no explicit riskLevel set.
 * Defaults to "good" for routine observations rather than "monitor".
 */
function inferRiskLevelFromLog(log: ActivityLogEntry): RiskLevel {
  const text = [log.notes ?? "", log.aiRecommendation ?? "", ...(log.aiNextSteps ?? [])]
    .join(" ")
    .toLowerCase()

  const routineTerms = [
    "routine check",
    "no concerns",
    "no issues",
    "all clear",
    "eating well",
    "doing well",
    "moving well",
    "good energy",
    "fully resolved",
    "fully sound",
    "improving",
    "on track",
    "normal expressive",
    "no action needed",
    "continue current",
    "bright eyes",
    "good weight",
    "coat coming in",
    "shedding well",
  ]
  if (routineTerms.some((t) => text.includes(t))) return "good"

  // Call-vet indicators
  const callVetTerms = [
    "call vet",
    "call the vet",
    "vet immediately",
    "emergency",
    "life-threatening",
    "prolapse",
    "hemorrhage",
    "colic",
    "fever",
    "isolation",
    "isolate immediately",
  ]
  if (callVetTerms.some((t) => text.includes(t))) return "call-vet"

  // Monitor indicators
  const monitorTerms = [
    "monitor closely",
    "watch for",
    "watch closely",
    "follow up",
    "recheck",
    "if worsens",
    "if persists",
    "escalate",
    "concerning",
    "laminitis",
    "wound",
    "laceration",
    "discharge",
    "swelling",
    "heat in",
    "limping",
    "lameness",
    "stiffness",
    "stiffly",
    "cautiously",
    "abscess",
    "dehydration",
    "off feed",
    "reduced intake",
    "lethargy",
    "spooky",
    "aggression",
    "separation",
    "behavior change",
  ]
  if (monitorTerms.some((t) => text.includes(t))) return "monitor"

  // Everything else — routine observations, positive notes,
  // farrier visits, dental floats with NSF, normal checks
  return "good"
}

/** Seed timeline + AI blocks from demo `SAMPLE_HORSE_ROWS` activity logs. */
export function buildInitialObservationsMap(): Record<string, ObservationEntry[]> {
  const map: Record<string, ObservationEntry[]> = {}
  for (const row of SAMPLE_HORSE_ROWS) {
    const key = horseRowKey(row)
    if (!row.logs?.length) continue
    map[key] = row.logs.map((log) => {
      const category = logCategoryToCategory(log.category)
      let aiResult: AIResult | null = null
      if (key === "minnie") {
        aiResult = minnieAiResult(String(log.id), log)
      } else if (log.aiNextSteps && log.aiNextSteps.length > 0) {
        const riskLevel = inferRiskLevelFromLog(log)
        aiResult = {
          riskLevel,
          riskLabel:
            riskLevel === "call-vet"
              ? "Call vet"
              : riskLevel === "monitor"
                ? "Monitor"
                : "No action needed",
          recommendations: log.aiNextSteps,
          patternNote: null,
        }
      }
      return {
        id: String(log.id),
        date: log.date,
        category,
        observationDomain: observationDomainFromCategory(category),
        notes: log.notes,
        loggedBy: log.loggedBy,
        aiResult,
      }
    })
  }
  return map
}

/** Newest observation by parsed `date` string (MM/DD/YY). */
export function getLatestObservationByDate(
  entries: ObservationEntry[] | undefined | null
): ObservationEntry | null {
  if (!entries?.length) return null
  return [...entries].sort((a, b) => parseObservationDate(b.date) - parseObservationDate(a.date))[0]!
}

export function parseObservationDate(dateStr: string): number {
  const m = dateStr.trim().match(/^(\d{1,2})\/(\d{1,2})\/(\d{2,4})$/)
  if (!m) return 0
  const mo = Number(m[1])
  const day = Number(m[2])
  let y = Number(m[3])
  if (m[3].length === 2) y += 2000
  return new Date(y, mo - 1, day).getTime()
}

export function formatObservationDate(d: Date): string {
  const m = d.getMonth() + 1
  const day = d.getDate()
  const y = d.getFullYear() % 100
  return `${m}/${day}/${y.toString().padStart(2, "0")}`
}
