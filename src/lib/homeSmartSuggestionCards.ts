import type { HorseTableRow } from "@/components/RanchWiseHorseRoster"
import { cattleEffectiveHealthBucket } from "@/lib/cattleSelectors"
import { getCalvingStatus } from "@/lib/calvingStatus"
import { daysUntilDue } from "@/lib/cattleUi"
import { buildHorseHomeWeeklyRollup } from "@/lib/homeHorseSummaryDerivers"
import { isPastureCheckOverdue, pastureDaysSinceLastCheck } from "@/lib/pastureCheckRecency"
import type { Cattle, Pasture } from "@/types/cattle"
import type { ObservationEntry } from "@/types/observation"

export type SmartSuggestionCardPriority = "high" | "watch" | "routine"

export type HorseDominantCategory = "Health" | "Behavior"

export type HomeSmartSuggestionCardsInput = {
  cattle: readonly Cattle[]
  observationsByCattleId: Record<string, ObservationEntry[]>
  herdRows: readonly HorseTableRow[]
  observationsByHorse: Record<string, ObservationEntry[]>
  pastures: readonly Pasture[]
  now?: Date
}

export type CattleSmartCardModel = {
  priority: SmartSuggestionCardPriority
  /** Single card copy line (headline + context merged). */
  statement: string
  ctaHref: string
}

export type HorseSmartCardModel = {
  priority: SmartSuggestionCardPriority
  dominantCategory: HorseDominantCategory
  categoryLabel: string
  statement: string
  ctaHref: string
}

export type PastureSmartCardModel = {
  priority: SmartSuggestionCardPriority
  statement: string
  ctaHref: string
}

export type HomeSmartSuggestionCardsModel = {
  cattle: CattleSmartCardModel
  horse: HorseSmartCardModel
  pasture: PastureSmartCardModel
}

function topPastureByGroup(
  cattleList: readonly Cattle[],
  pastures: readonly Pasture[],
  predicate: (c: Cattle) => boolean
): string {
  const counts = new Map<string, number>()
  for (const c of cattleList) {
    if (!predicate(c)) continue
    const id = c.pastureId ?? ""
    counts.set(id, (counts.get(id) ?? 0) + 1)
  }
  if (counts.size === 0) return "Herd-wide"
  let bestId = ""
  let bestN = -1
  for (const [id, n] of counts) {
    if (n > bestN) {
      bestN = n
      bestId = id
    }
  }
  const name = pastures.find((p) => p.id === bestId)?.name
  return name?.trim() || "Herd-wide"
}

export function countElevatedSmartSuggestionCards(model: HomeSmartSuggestionCardsModel): number {
  return [model.cattle.priority, model.horse.priority, model.pasture.priority].filter(
    (p) => p !== "routine"
  ).length
}

export function buildHomeSmartSuggestionCardsModel(
  input: HomeSmartSuggestionCardsInput
): HomeSmartSuggestionCardsModel {
  const now = input.now ?? new Date()
  const { cattle, observationsByCattleId, herdRows, observationsByHorse, pastures } = input

  const calvingSoon = cattle.filter((c) => getCalvingStatus(c) === "calving-soon")
  const inLabor = cattle.filter((c) => getCalvingStatus(c) === "in-labor")
  const pregnant = cattle.filter((c) => getCalvingStatus(c) === "pregnant")
  const flagged = cattle.filter(
    (c) => cattleEffectiveHealthBucket(c, observationsByCattleId) === "Flag"
  )
  const anyOverdue = cattle.some((c) => {
    const d = daysUntilDue(c.dueDate)
    return d !== null && d < 0
  })

  const pastureName =
    calvingSoon.length > 0
      ? topPastureByGroup(cattle, pastures, (c) => getCalvingStatus(c) === "calving-soon")
      : pregnant.length > 0
        ? topPastureByGroup(cattle, pastures, (c) => getCalvingStatus(c) === "pregnant")
        : "Herd-wide"

  let cattlePriority: SmartSuggestionCardPriority = "routine"
  if (inLabor.length > 0 || flagged.length >= 5 || anyOverdue) cattlePriority = "high"
  else if (calvingSoon.length > 0 || (flagged.length >= 1 && flagged.length <= 4)) cattlePriority = "watch"

  const inLaborHeadline = inLabor.length > 0

  const cattleCtaHref = inLaborHeadline ? "/cattle?filter=in-labor" : "/cattle?calvingStatus=calving-soon"

  let cattleStatement = ""
  if (inLaborHeadline) {
    cattleStatement = `${inLabor.length} cow${inLabor.length === 1 ? "" : "s"} in active labor. ${pastureName} is most concentrated.`
  } else if (calvingSoon.length > 0) {
    cattleStatement = `${calvingSoon.length} cow${calvingSoon.length === 1 ? "" : "s"} in calving-soon window. ${pastureName} is most concentrated.`
    if (flagged.length > 0) {
      cattleStatement += ` Herd-wide, ${flagged.length} cow${flagged.length === 1 ? "" : "s"} ${flagged.length === 1 ? "is" : "are"} health-flagged for follow-up.`
    }
  } else {
    cattleStatement = `Calving steady with ${pregnant.length} pregnant. ${pastureName} is most concentrated.`
  }

  const { pulseMetrics } = buildHorseHomeWeeklyRollup(herdRows, observationsByHorse, now)
  const {
    watchHorseCount,
    acuteHorseCount,
    healthWatchCount,
    behaviorWatchCount,
    monitorOnlyHorseCount,
    rosterHealthFlagCount,
    rosterBehaviorFlagCount,
  } = pulseMetrics

  const dominantCategory: HorseDominantCategory =
    behaviorWatchCount > healthWatchCount ? "Behavior" : "Health"

  let horseStatement = ""
  if (healthWatchCount === 0 && behaviorWatchCount === 0) {
    horseStatement = "All horses healthy this week."
  } else if (dominantCategory === "Health") {
    if (acuteHorseCount > 0) {
      if (rosterHealthFlagCount > acuteHorseCount) {
        horseStatement = `${rosterHealthFlagCount} horse${rosterHealthFlagCount === 1 ? "" : "s"} show health-flag on the roster; ${acuteHorseCount} acute AI health note${acuteHorseCount === 1 ? "" : "s"} in the last 7 days.`
      } else if (rosterHealthFlagCount === acuteHorseCount && acuteHorseCount === 1) {
        horseStatement = "1 acute health case needs vet follow-up."
      } else if (rosterHealthFlagCount === acuteHorseCount) {
        horseStatement = `${acuteHorseCount} acute health cases need vet follow-up.`
      } else {
        horseStatement =
          acuteHorseCount === 1
            ? "1 acute health case needs vet follow-up."
            : `${acuteHorseCount} acute health cases need vet follow-up.`
      }
      if (monitorOnlyHorseCount > 0) {
        horseStatement += ` ${monitorOnlyHorseCount} horse${monitorOnlyHorseCount === 1 ? "" : "s"} on monitor without acute flags.`
      }
    } else if (healthWatchCount > 0) {
      horseStatement = `${healthWatchCount} horse${healthWatchCount === 1 ? "" : "s"} on health monitor. Recheck flagged entries this week.`
    } else {
      horseStatement = "Roster health looks steady this week."
    }
  } else {
    if (rosterBehaviorFlagCount > behaviorWatchCount) {
      horseStatement = `${rosterBehaviorFlagCount} horse${rosterBehaviorFlagCount === 1 ? "" : "s"} show behavior-flag on the roster; ${behaviorWatchCount} behavior watch note${behaviorWatchCount === 1 ? "" : "s"} in the last 7 days.`
    } else if (rosterBehaviorFlagCount === behaviorWatchCount && behaviorWatchCount === 1) {
      horseStatement = "1 behavior incident needs recheck before the next pasture rotation."
    } else if (rosterBehaviorFlagCount === behaviorWatchCount) {
      horseStatement = `${behaviorWatchCount} behavior incidents need recheck before the next pasture rotation.`
    } else {
      horseStatement =
        behaviorWatchCount === 1
          ? "1 behavior incident needs recheck before the next pasture rotation."
          : `${behaviorWatchCount} behavior incidents need recheck before the next pasture rotation.`
    }
  }

  let horsePriority: SmartSuggestionCardPriority = "routine"
  if (acuteHorseCount >= 3 || behaviorWatchCount >= 3) horsePriority = "high"
  else if (watchHorseCount > 0) horsePriority = "watch"

  const categoryLabel = `HORSES · ${dominantCategory.toUpperCase()}`

  let horseCtaHref = "/horses"
  if (watchHorseCount > 0) {
    if (dominantCategory === "Health") {
      horseCtaHref =
        rosterHealthFlagCount > 0 ? "/horses?healthStatus=flag" : "/horses?healthStatus=monitor"
    } else if (rosterBehaviorFlagCount > 0) {
      horseCtaHref = "/horses?behaviorStatus=flag"
    } else {
      horseCtaHref = "/horses?behaviorStatus=flag,monitor"
    }
  }

  const overdueList = pastures.filter((p) => isPastureCheckOverdue(p, 10))
  const overdueCount = overdueList.length

  let worst: { name: string; days: number } | null = null
  for (const p of overdueList) {
    const d = pastureDaysSinceLastCheck(p)
    if (d === null) continue
    if (!worst || d > worst.days) {
      worst = { name: p.name?.trim() || "Pasture", days: d }
    }
  }

  const anyOver14 = pastures.some((p) => {
    const d = pastureDaysSinceLastCheck(p)
    return d !== null && d > 14
  })

  let pasturePriority: SmartSuggestionCardPriority = "routine"
  if (anyOver14) pasturePriority = "high"
  else if (overdueCount > 0) pasturePriority = "watch"

  const pastureCtaHref = overdueCount > 0 ? "/pastures?overdueChecks=true" : "/pastures"

  const pastureStatement = worst
    ? `${worst.name} not walked in ${worst.days} days.`
    : "Latest pasture checks within 10 days."

  return {
    cattle: {
      priority: cattlePriority,
      statement: cattleStatement,
      ctaHref: cattleCtaHref,
    },
    horse: {
      priority: horsePriority,
      dominantCategory,
      categoryLabel,
      statement: horseStatement,
      ctaHref: horseCtaHref,
    },
    pasture: {
      priority: pasturePriority,
      statement: pastureStatement,
      ctaHref: pastureCtaHref,
    },
  }
}
