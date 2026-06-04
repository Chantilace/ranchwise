import type { PastureStatus } from "@/lib/statusUtils"
import { PASTURE_STATUS_LABELS } from "@/lib/statusUtils"
import type { AIResult, RiskLevel } from "@/types/observation"

export type PastureCheckCategory = "drive_by" | "horseback" | "maintenance"

export const PASTURE_CHECK_CATEGORY_LABELS: Record<PastureCheckCategory, string> = {
  drive_by: "Drive-by",
  horseback: "Horseback",
  maintenance: "Maintenance",
}

export const PASTURE_CHECK_CATEGORIES: PastureCheckCategory[] = [
  "drive_by",
  "horseback",
  "maintenance",
]

/** Pasture check log row (commit-then-finalize flow; mirrors observation AI shape). */
export type PastureCheckEntry = {
  id: string
  pastureId: string
  /** Epoch ms (stable for sorting / display via `new Date(date)`). */
  date: number
  category: PastureCheckCategory
  status: PastureStatus | null
  body: string
  author: string
  aiResult?: AIResult | null
}

/** Maps mockAnalyze `RiskLevel` to persisted pasture status (same ramp as StatusBadge). */
export function riskLevelToPastureStatus(level: RiskLevel): PastureStatus {
  if (level === "flag") return "action_needed"
  if (level === "monitor") return "concern"
  return "stable"
}

export function pastureStatusToRiskLevel(status: PastureStatus): RiskLevel {
  if (status === "action_needed") return "flag"
  if (status === "concern") return "monitor"
  return "good"
}

export function pastureAssessedLabelFromRisk(level: RiskLevel): string {
  if (level === "flag") return PASTURE_STATUS_LABELS.action_needed
  if (level === "monitor") return PASTURE_STATUS_LABELS.concern
  return PASTURE_STATUS_LABELS.stable
}
