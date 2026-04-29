import { differenceInDays, parseISO } from "date-fns"
import {
  AlertTriangle,
  Fence,
  Flag,
  RefreshCw,
  Sparkle,
  TrendingDown,
  type LucideIcon,
} from "lucide-react"

import type { HorseTableRow } from "@/components/RanchWiseHorseRoster"
import { horseRowKey } from "@/components/RanchWiseHorseRoster"
import { getObservationDomain } from "@/lib/observationDomain"
import { parseObservationDate } from "@/lib/initialObservations"
import type { Cattle, Pasture } from "@/types/cattle"
import type { ObservationEntry } from "@/types/observation"

export const PASTURE_CHECK_OVERDUE_DAYS = 2
export const BEHAVIOR_RECHECK_DAYS = 7

export const TODO_PRIORITY = [
  "cattle-in-labor",
  "training-regressions",
  "behavior-flagged-new",
  "pasture-checks",
  "behavior-recheck",
  "first-behavior-check",
] as const

export type TodoTypeId = (typeof TODO_PRIORITY)[number]

export type TodoChipVariant = "flag" | "amber" | "pasture" | "neutral"

export type ActiveTodo = {
  type: TodoTypeId
  title: string
  count: number
  destination: string
  icon: LucideIcon
  chipVariant: TodoChipVariant
}

function observationTriState(entry: ObservationEntry): "good" | "monitor" | "flag" | null {
  const rl = entry.aiResult?.riskLevel
  if (!rl) return null
  if (rl === "flag") return "flag"
  if (rl === "monitor") return "monitor"
  return "good"
}

function behaviorObservations(observations: ObservationEntry[] | undefined): ObservationEntry[] {
  if (!observations?.length) return []
  return observations.filter((o) => getObservationDomain(o) === "behavior")
}

function obsTime(o: ObservationEntry): number {
  return parseObservationDate(o.date)
}

export function getInLaborCattle(cattle: Cattle[]): Cattle[] {
  return cattle.filter((c) => c.calvingStatus === "in-labor")
}

export function daysSincePastureCheck(lastCheckIso: string | undefined): number {
  if (!lastCheckIso) return 999
  try {
    return differenceInDays(new Date(), parseISO(lastCheckIso))
  } catch {
    return 999
  }
}

export function getOverduePastures(pastures: Pasture[]): Pasture[] {
  return pastures.filter((p) => daysSincePastureCheck(p.lastCheckDate) > PASTURE_CHECK_OVERDUE_DAYS)
}

export function getTrainingRegressions(
  horses: HorseTableRow[],
  observationsByHorse: Record<string, ObservationEntry[]>
): HorseTableRow[] {
  return horses.filter((h) => {
    if (h.behaviorStatus !== "flag") return false
    const behaviorObs = behaviorObservations(observationsByHorse[horseRowKey(h)])
    const flagged = behaviorObs
      .filter((o) => observationTriState(o) === "flag")
      .sort((a, b) => obsTime(b) - obsTime(a))
    const currentFlag = flagged[0]
    if (!currentFlag) return false
    const tFlag = obsTime(currentFlag)
    return behaviorObs.some((o) => {
      if (observationTriState(o) !== "good") return false
      return obsTime(o) < tFlag
    })
  })
}

export function getNewBehaviorFlags(
  horses: HorseTableRow[],
  observationsByHorse: Record<string, ObservationEntry[]>
): HorseTableRow[] {
  return horses.filter((h) => {
    if (h.behaviorStatus !== "flag") return false
    const behaviorObs = behaviorObservations(observationsByHorse[horseRowKey(h)])
    return !behaviorObs.some((o) => observationTriState(o) === "good")
  })
}

export function getBehaviorRecheck(
  horses: HorseTableRow[],
  observationsByHorse: Record<string, ObservationEntry[]>
): HorseTableRow[] {
  return horses.filter((h) => {
    if (h.behaviorStatus !== "monitor") return false
    const behaviorObs = behaviorObservations(observationsByHorse[horseRowKey(h)])
    const sorted = [...behaviorObs].sort((a, b) => obsTime(b) - obsTime(a))
    const lastBehaviorObs = sorted[0]
    if (!lastBehaviorObs) return false
    const days = differenceInDays(new Date(), new Date(obsTime(lastBehaviorObs)))
    return days >= BEHAVIOR_RECHECK_DAYS
  })
}

export function getJuvenilesNeedingFirstBehavior(
  horses: HorseTableRow[],
  observationsByHorse: Record<string, ObservationEntry[]>
): HorseTableRow[] {
  return horses.filter((h) => {
    if (h.role.trim() !== "Juvenile") return false
    const obs = observationsByHorse[horseRowKey(h)] ?? []
    return !obs.some((o) => getObservationDomain(o) === "behavior")
  })
}

export function isTrainingRegressionHorse(
  horse: HorseTableRow,
  observations: ObservationEntry[] | undefined
): boolean {
  return getTrainingRegressions([horse], { [horseRowKey(horse)]: observations ?? [] }).length > 0
}

export function isNewBehaviorFlagHorse(
  horse: HorseTableRow,
  observations: ObservationEntry[] | undefined
): boolean {
  return getNewBehaviorFlags([horse], { [horseRowKey(horse)]: observations ?? [] }).length > 0
}

export function isBehaviorRecheckHorse(
  horse: HorseTableRow,
  observations: ObservationEntry[] | undefined
): boolean {
  return getBehaviorRecheck([horse], { [horseRowKey(horse)]: observations ?? [] }).length > 0
}

export function isJuvenileNeedingFirstBehavior(
  horse: HorseTableRow,
  observations: ObservationEntry[] | undefined
): boolean {
  return getJuvenilesNeedingFirstBehavior([horse], { [horseRowKey(horse)]: observations ?? [] }).length > 0
}

function sortTodos(a: ActiveTodo, b: ActiveTodo): number {
  return TODO_PRIORITY.indexOf(a.type) - TODO_PRIORITY.indexOf(b.type)
}

export function deriveActiveTodos(input: {
  cattle: Cattle[]
  pastures: Pasture[]
  horses: HorseTableRow[]
  observationsByHorse: Record<string, ObservationEntry[]>
}): ActiveTodo[] {
  const { cattle, pastures, horses, observationsByHorse } = input
  const cards: ActiveTodo[] = []

  const inLabor = getInLaborCattle(cattle)
  if (inLabor.length > 0) {
    cards.push({
      type: "cattle-in-labor",
      title: "In labor",
      count: inLabor.length,
      destination: "/cattle?calvingStatus=in-labor",
      icon: AlertTriangle,
      chipVariant: "flag",
    })
  }

  const regressions = getTrainingRegressions(horses, observationsByHorse)
  if (regressions.length > 0) {
    cards.push({
      type: "training-regressions",
      title: "Training regressions",
      count: regressions.length,
      destination: "/horses?behaviorStatus=flag&regression=true",
      icon: TrendingDown,
      chipVariant: "amber",
    })
  }

  const newFlags = getNewBehaviorFlags(horses, observationsByHorse)
  if (newFlags.length > 0) {
    cards.push({
      type: "behavior-flagged-new",
      title: "Behavior flagged",
      count: newFlags.length,
      destination: "/horses?behaviorStatus=flag&new=true",
      icon: Flag,
      chipVariant: "flag",
    })
  }

  const overduePastures = getOverduePastures(pastures)
  if (overduePastures.length > 0) {
    cards.push({
      type: "pasture-checks",
      title: "Pasture checks",
      count: overduePastures.length,
      destination: "/pastures",
      icon: Fence,
      chipVariant: "pasture",
    })
  }

  const recheck = getBehaviorRecheck(horses, observationsByHorse)
  if (recheck.length > 0) {
    cards.push({
      type: "behavior-recheck",
      title: "Behavior recheck",
      count: recheck.length,
      destination: "/horses?behaviorStatus=monitor&recheck=true",
      icon: RefreshCw,
      chipVariant: "amber",
    })
  }

  const firstBehavior = getJuvenilesNeedingFirstBehavior(horses, observationsByHorse)
  if (firstBehavior.length > 0) {
    cards.push({
      type: "first-behavior-check",
      title: "First behavior check",
      count: firstBehavior.length,
      destination: "/horses?role=Juvenile&needsBehaviorObservation=true",
      icon: Sparkle,
      chipVariant: "neutral",
    })
  }

  return cards.sort(sortTodos)
}
