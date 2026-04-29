import type { Category, ObservationEntry, RiskLevel } from "@/types/observation"
import { SAMPLE_CATTLE } from "@/lib/cattleSeed"
import { observationDomainFromCategory } from "@/lib/observationDomain"
import { fillCattleObservationGaps } from "@/lib/seedCattleObservationGaps"
import { seedDaysAgo } from "@/lib/observationSeedDates"

function obs(
  id: string,
  date: string,
  category: Category,
  notes: string,
  loggedBy: string,
  riskLevel: RiskLevel,
  recommendations: string[],
  patternNote?: string,
): ObservationEntry {
  return {
    id,
    date,
    category,
    observationDomain: observationDomainFromCategory(category),
    notes,
    loggedBy,
    aiResult: {
      riskLevel,
      riskLabel:
        riskLevel === "flag"
          ? "Flag"
          : riskLevel === "monitor"
            ? "Monitor"
            : "Good",
      recommendations,
      patternNote: patternNote ?? null,
    },
  }
}

/**
 * Sparse cattle observation seed for late-season calm demo.
 * `fillCattleObservationGaps` adds calving follow-ups; two call-vet rows below
 * stay newest so `cattleEffectiveHealthBucket` resolves to Flag for exactly those animals.
 */
export function buildInitialCattleObservationsMap(): Record<string, ObservationEntry[]> {
  const map: Record<string, ObservationEntry[]> = {}

  function set(id: string, entries: ObservationEntry[]) {
    map[id] = entries
  }

  set("ct-east-5", [
    obs(
      "ce5-r1",
      seedDaysAgo(4),
      "Health",
      "Routine bunk check — eating with group, manure formed, no lameness at walk-by.",
      "Lou",
      "good",
      ["Continue rotation as posted.", "Note heat load if wind quits."],
    ),
  ])

  set("ct-ne-22", [
    obs(
      "cne22-r1",
      seedDaysAgo(3),
      "Feeding",
      "Hay ring topped off — clean grass hay, pairs spread evenly, no choke risk at gate.",
      "Wyatt",
      "good",
      ["Same drop tomorrow.", "Photo tag board if count changes."],
    ),
  ])

  set("ct-se-33", [
    obs(
      "cse33-r1",
      seedDaysAgo(5),
      "Behavior",
      "Moved group through alley without bunching — lead cows steady, calves stayed paired.",
      "Oliver",
      "good",
      ["Good handling note for crew board.", "Repeat same order next move."],
    ),
  ])

  fillCattleObservationGaps(map, SAMPLE_CATTLE)

  // Two acute health demos (newest-first merge: unshift so these win latest-risk)
  const flagA = "ct-ne-10"
  const flagB = "ct-se-12"
  map[flagA] = [
    obs(
      "demo-flag-ne-1",
      seedDaysAgo(0),
      "Health",
      "Cow slow to rise after loafing — tracking left rear, warm hock, vet text sent with short video.",
      "Juniper",
      "flag",
      [
        "Hold from shipping list until vet clears.",
        "Deep straw pen only — no alley pushing.",
        "Offer water at bunk, note intake by evening.",
      ],
      "Acute lameness in a fresh cow needs same-day rule-out before transport.",
    ),
    ...(map[flagA] ?? []),
  ]
  map[flagB] = [
    obs(
      "demo-flag-se-1",
      seedDaysAgo(1),
      "Health",
      "Off feed at morning grain — stood with arched back, manure loose but not watery. Temp not taken yet.",
      "Frankie",
      "flag",
      [
        "Pull to sick pen with shade and fresh water.",
        "Take temp before evening feed; page vet line if >103°F.",
        "Hold rumen drench until vet advises.",
      ],
      "Sudden appetite drop with posture change warrants same-day vet eyes.",
    ),
    ...(map[flagB] ?? []),
  ]

  return map
}
