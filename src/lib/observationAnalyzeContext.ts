import type { CattleCalvingHistoryInput } from "@/lib/cattleDystociaObservationAi"
import type { PastureCheckEntry } from "@/lib/pastureCheckTypes"
import { pastureAssessedLabelFromRisk, pastureStatusToRiskLevel } from "@/lib/pastureCheckTypes"
import { parseObservationDate } from "@/lib/initialObservations"
import type { PastureStatus } from "@/lib/statusUtils"
import type { ObservationEntry } from "@/types/observation"
import type { Category, RiskLevel } from "@/types/observation"

export const OBSERVATION_ANALYZE_DELAY_MS = 1400

/** Returned from `onSave(..., { stage: "commit" })` so analyzers can use pre-commit history. */
export type LogObservationCommitAnalyzeMeta =
  | {
      kind: "horse"
      horseKey: string
      horseId: string
      entityName: string
      priorObservations: ObservationEntry[]
    }
  | {
      kind: "cattle"
      cattleId: string
      entityName: string
      priorObservations: ObservationEntry[]
      calvingStatus?: string
      cattleCalvingSnapshot?: CattleCalvingHistoryInput
    }
  | {
      kind: "pasture"
      pastureId: string
      pastureName: string
      priorChecks: PastureCheckEntry[]
    }

export type RecentObservationForAnalyze = {
  loggedAt: Date
  category: Category | "pasture-check"
  notes: string
  riskLevel: RiskLevel
  riskLabel: string
}

export type EntityContext = {
  entityKind: "horse" | "cattle" | "pasture"
  entityId: string
  entityName: string
  recentObservations: RecentObservationForAnalyze[]
  /** Pasture: oldest-first statuses from prior checks (before the in-flight entry). */
  conditionTrend?: PastureStatus[]
  calvingStatus?: string
  /** Cattle: fields for prior-calving sentence in dystocia AI. */
  cattleCalvingSnapshot?: CattleCalvingHistoryInput
}

export function observationDateToLocalDate(dateStr: string): Date {
  const t = parseObservationDate(dateStr)
  return new Date(t)
}

export function daysSince(date: Date, from: Date = new Date()): number {
  const a = Date.UTC(from.getFullYear(), from.getMonth(), from.getDate())
  const b = Date.UTC(date.getFullYear(), date.getMonth(), date.getDate())
  return Math.max(0, Math.floor((a - b) / 86_400_000))
}

export function entriesToRecentSnapshots(
  entries: ObservationEntry[],
  limit = 14
): RecentObservationForAnalyze[] {
  return [...entries]
    .sort((a, b) => parseObservationDate(b.date) - parseObservationDate(a.date))
    .slice(0, limit)
    .map((e) => ({
      loggedAt: observationDateToLocalDate(e.date),
      category: e.category,
      notes: e.notes,
      riskLevel: e.aiResult?.riskLevel ?? "good",
      riskLabel: e.aiResult?.riskLabel ?? "Good",
    }))
}

export function pastureChecksToRecentSnapshots(
  checks: PastureCheckEntry[],
  limit = 14
): RecentObservationForAnalyze[] {
  return [...checks]
    .sort((a, b) => b.date - a.date)
    .slice(0, limit)
    .map((c) => {
      const risk = pastureStatusToRiskLevel(c.status ?? "stable")
      return {
        loggedAt: new Date(c.date),
        category: "pasture-check" as const,
        notes: c.body,
        riskLevel: risk,
        riskLabel: pastureAssessedLabelFromRisk(risk),
      }
    })
}

export function conditionTrendFromPriorChecks(
  checks: PastureCheckEntry[],
  maxPoints = 5
): PastureStatus[] {
  const sorted = [...checks].sort((a, b) => a.date - b.date)
  return sorted.slice(-maxPoints).map((c) => c.status ?? "stable")
}

export function buildEntityContextFromCommitMeta(
  meta: LogObservationCommitAnalyzeMeta | undefined | null
): EntityContext | undefined {
  if (!meta) return undefined
  if (meta.kind === "pasture") {
    return {
      entityKind: "pasture",
      entityId: meta.pastureId,
      entityName: meta.pastureName,
      recentObservations: pastureChecksToRecentSnapshots(meta.priorChecks),
      conditionTrend: conditionTrendFromPriorChecks(meta.priorChecks),
    }
  }
  if (meta.kind === "horse") {
    return {
      entityKind: "horse",
      entityId: meta.horseId,
      entityName: meta.entityName,
      recentObservations: entriesToRecentSnapshots(meta.priorObservations),
    }
  }
  return {
    entityKind: "cattle",
    entityId: meta.cattleId,
    entityName: meta.entityName,
    recentObservations: entriesToRecentSnapshots(meta.priorObservations),
    calvingStatus: meta.calvingStatus,
    cattleCalvingSnapshot: meta.cattleCalvingSnapshot,
  }
}

/** Handling / location cue for behavior recheck copy. */
export function extractHandlingContext(notes: string): string | null {
  const t = notes.toLowerCase()
  if (t.includes("cross-tie") || t.includes("cross tie")) return "cross-tie"
  if (t.includes("cross-tied")) return "cross-tie"
  if (t.includes("stall")) return "stall"
  if (t.includes("aisle")) return "aisle"
  if (t.includes("paddock")) return "paddock"
  if (t.includes("pasture")) return "pasture"
  if (t.includes("round pen") || t.includes("roundpen")) return "round pen"
  return null
}

export type TrendDirection = "improving" | "stable" | "declining"

/** Maps pasture status ramp to numeric score for simple trend reads. */
function statusScore(s: PastureStatus): number {
  if (s === "stable") return 0
  if (s === "concern") return 1
  return 2
}

export function detectPastureTrend(statuses: PastureStatus[]): TrendDirection {
  if (statuses.length < 2) return "stable"
  const first = statusScore(statuses[0]!)
  const last = statusScore(statuses[statuses.length - 1]!)
  if (last > first) return "declining"
  if (last < first) return "improving"
  return "stable"
}
