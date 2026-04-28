import type { ActivityLogEntry } from "@/components/RanchWiseHorseRoster"
import { SAMPLE_HORSE_ROWS, horseRowKey } from "@/components/RanchWiseHorseRoster"
import { buildSupplementalHorseObservations } from "@/lib/horseObservationsSupplementSeed"
import { getObservationDomain, observationDomainFromCategory } from "@/lib/observationDomain"
import { seedDaysAgo } from "@/lib/observationSeedDates"
import type { AIResult, Category, ObservationEntry, RiskLevel } from "@/types/observation"

const MS_DAY_HORSE = 86_400_000

function fillHorseObservationGaps(map: Record<string, ObservationEntry[]>) {
  const fourteenAgo = Date.now() - 14 * MS_DAY_HORSE

  function latestRisk(obs: ObservationEntry[]): RiskLevel | null {
    const withAi = obs.filter((o) => o.aiResult)
    if (!withAi.length) return null
    const sorted = [...withAi].sort((a, b) => parseObservationDate(b.date) - parseObservationDate(a.date))
    return sorted[0]?.aiResult?.riskLevel ?? null
  }

  function hasRecentCallVetHealth(entries: ObservationEntry[]): boolean {
    return entries.some(
      (o) =>
        getObservationDomain(o) === "health" &&
        o.aiResult?.riskLevel === "call-vet" &&
        parseObservationDate(o.date) >= fourteenAgo
    )
  }

  for (const row of SAMPLE_HORSE_ROWS) {
    const key = horseRowKey(row)
    let cur = map[key] ?? []

    if (row.healthStatus === "monitor") {
      const healthObs = cur.filter((o) => getObservationDomain(o) === "health")
      const lr = latestRisk(healthObs)
      if (lr !== "monitor" && lr !== "call-vet") {
        cur = [
          {
            id: `gap-${key}-hm`,
            date: seedDaysAgo(2),
            category: "Health",
            observationDomain: "health",
            notes:
              "Roster watch — hay ration cleaned up slower than pen mates, manure a bit loose, otherwise bright at the gate.",
            loggedBy: "Jake",
            aiResult: {
              riskLevel: "monitor",
              riskLabel: "Monitor",
              recommendations: [
                "Temp at next feeding.",
                "Offer grass hay before grain.",
                "Photo manure card for manager if it stays loose tomorrow.",
              ],
              patternNote: null,
            },
          },
          ...cur,
        ]
        map[key] = cur
      }
    }

    cur = map[key] ?? []

    if (row.healthStatus === "flag" && !hasRecentCallVetHealth(cur)) {
      cur = [
        {
          id: `gap-${key}-hf`,
          date: seedDaysAgo(1),
          category: "Health",
          observationDomain: "health",
          notes:
            "Acute episode on roster — hard breathing after short walk to chute, nose dry, handler stopped work and shaded her.",
          loggedBy: "Chantale",
          aiResult: {
            riskLevel: "call-vet",
            riskLabel: "Call vet",
            recommendations: [
              "Vet callback scheduled from field.",
              "No transport until respiratory rate normalizes.",
              "Water close in shade; crew radio channel noted on whiteboard.",
            ],
            patternNote: "Sudden exertional distress in hot weather needs same-day vet eyes.",
          },
        },
        ...cur,
      ]
      map[key] = cur
    }

    cur = map[key] ?? []

    if (row.behaviorStatus === "monitor") {
      const behObs = cur.filter((o) => getObservationDomain(o) === "behavior")
      const lr = latestRisk(behObs)
      if (lr !== "monitor" && lr !== "call-vet") {
        cur = [
          {
            id: `gap-${key}-bm`,
            date: seedDaysAgo(3),
            category: "Behavior",
            observationDomain: "behavior",
            notes:
              "Halter session — rushed backing steps when asked to yield hindquarters, no bite but tight in poll.",
            loggedBy: "Maria",
            aiResult: {
              riskLevel: "monitor",
              riskLabel: "Monitor",
              recommendations: [
                "Shorter sessions for a week.",
                "End on a soft step when poll relaxes.",
                "Note if tension ties to feed time or herd noise.",
              ],
              patternNote: null,
            },
          },
          ...cur,
        ]
        map[key] = cur
      }
    }

    cur = map[key] ?? []

    if (row.behaviorStatus === "flag") {
      const behObs = cur.filter((o) => getObservationDomain(o) === "behavior")
      if (latestRisk(behObs) !== "call-vet") {
        cur = [
          {
            id: `gap-${key}-bf`,
            date: seedDaysAgo(1),
            category: "Behavior",
            observationDomain: "behavior",
            notes:
              "Serious herd incident — pinned a younger gelding against panels at hay drop, drew blood on withers before split.",
            loggedBy: "Joe",
            aiResult: {
              riskLevel: "call-vet",
              riskLabel: "Call vet",
              recommendations: [
                "Separate until vet clears for turnout.",
                "Document wound photos for file.",
                "No shared feed line with that group until behavior plan updated.",
              ],
              patternNote: "Injury during dominance behavior warrants vet check and management change.",
            },
          },
          ...cur,
        ]
        map[key] = cur
      }
    }
  }
}

function mergeHorseObservationsNewestFirst(
  base: ObservationEntry[],
  extra: ObservationEntry[]
): ObservationEntry[] {
  if (extra.length === 0) return [...base]
  if (base.length === 0) return [...extra]
  return [...base, ...extra].sort((a, b) => parseObservationDate(b.date) - parseObservationDate(a.date))
}

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
  const supplement = buildSupplementalHorseObservations()
  for (const [key, extra] of Object.entries(supplement)) {
    map[key] = mergeHorseObservationsNewestFirst(map[key] ?? [], extra)
  }
  fillHorseObservationGaps(map)
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
