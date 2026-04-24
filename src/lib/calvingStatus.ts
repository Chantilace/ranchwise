import { differenceInDays, parseISO, startOfDay } from "date-fns"
import type {
  CalfStatus,
  CalvingComplication,
  CalvingRecord,
  Cattle,
  DeliveryType,
  EffectiveCalvingStatus,
} from "@/types/cattle"
import { getStatusBadgeClass } from "@/lib/statusUtils"

export type { EffectiveCalvingStatus } from "@/types/cattle"

/** Persisted on `Cattle.calvingStatus`. Auto tiers are derived via `getCalvingStatus`. */
export function getCalvingStatus(cattle: Cattle): EffectiveCalvingStatus {
  if (cattle.calvingStatus === "none") return "none"
  const stored = cattle.calvingStatus
  if (stored === "in-labor" || stored === "calved" || stored === "complications") {
    return stored
  }

  if (!cattle.dueDate) return "pregnant"

  const daysUntilDue = differenceInDays(startOfDay(parseISO(cattle.dueDate)), startOfDay(new Date()))
  if (daysUntilDue <= 14) return "calving-soon"
  return "pregnant"
}

const EFFECTIVE_CALVING_BADGE_KEY: Record<EffectiveCalvingStatus, string> = {
  pregnant: "Pregnant",
  "calving-soon": "Calving soon",
  "in-labor": "In labor",
  calved: "Calved",
  complications: "Complications",
  none: "—",
}

const calvingLabel: Record<EffectiveCalvingStatus, (c: Cattle) => string> = {
  pregnant: () => "Pregnant",
  "calving-soon": () => "Calving soon",
  "in-labor": () => "In labor",
  calved: (_c) => "Calved",
  complications: () => "Complications",
  none: () => "—",
}

export function calvingStatusBadgeClassAndLabel(
  cattle: Cattle
): { className: string; label: string } | null {
  const effective = getCalvingStatus(cattle)
  if (effective === "none") return null
  const badgeKey = EFFECTIVE_CALVING_BADGE_KEY[effective]
  return {
    className: getStatusBadgeClass(badgeKey),
    label: calvingLabel[effective](cattle),
  }
}

const DELIVERY_LABEL: Record<DeliveryType, string> = {
  normal: "Normal",
  assisted: "Assisted",
  "c-section": "C-section",
}

const CALF_LABEL: Record<CalfStatus, string> = {
  live: "Live",
  stillborn: "Stillborn",
  unknown: "Unknown",
}

const COMPLICATION_LABEL: Record<CalvingComplication, string> = {
  none: "None",
  "retained-placenta": "Retained placenta",
  prolapse: "Prolapse",
  hemorrhage: "Hemorrhage",
}

export function buildCalvingObservationNotes(record: CalvingRecord): string {
  const parts: string[] = []
  parts.push(`${DELIVERY_LABEL[record.deliveryType]} delivery.`)
  parts.push(`${CALF_LABEL[record.calfStatus]} calf.`)
  const realComps = record.complications.filter((c) => c !== "none")
  if (realComps.length > 0) {
    parts.push(
      `Complications: ${realComps.map((c) => COMPLICATION_LABEL[c] ?? c).join(", ")}.`
    )
  }
  if (record.notes?.trim()) parts.push(record.notes.trim())
  return parts.join(" ")
}

export function formatDeliveryTypeLabel(t?: DeliveryType | null) {
  return t ? DELIVERY_LABEL[t] ?? t : "—"
}

export function formatCalfStatusLabel(s?: CalfStatus | null) {
  return s ? CALF_LABEL[s] ?? s : "—"
}

export function formatComplicationsSummary(complications?: CalvingComplication[] | null) {
  if (!complications?.length) return "—"
  const real = complications.filter((c) => c !== "none")
  if (real.length === 0) return "None noted"
  return real.map((c) => COMPLICATION_LABEL[c] ?? c).join(", ")
}

export const CALVING_FILTER_OPTIONS: { id: EffectiveCalvingStatus; label: string }[] = [
  { id: "pregnant", label: "Pregnant" },
  { id: "calving-soon", label: "Calving soon" },
  { id: "in-labor", label: "In labor" },
  { id: "calved", label: "Calved" },
  { id: "complications", label: "Complications" },
  { id: "none", label: "—" },
]

export function createDefaultCalvingFilterSet(): Set<EffectiveCalvingStatus> {
  return new Set(CALVING_FILTER_OPTIONS.map((o) => o.id))
}
