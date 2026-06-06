import { getCalvingStatus } from "@/lib/calvingStatus"
import type { CalfStatus, CalvingComplication, Cattle, DeliveryType } from "@/types/cattle"

export type CalvingStage = "in-labor" | "calved"

export const CALVING_STAGE_OPTIONS: { id: CalvingStage; label: string }[] = [
  { id: "in-labor", label: "In labor" },
  { id: "calved", label: "Calved" },
]

export const CALVING_DELIVERY_OPTIONS: { id: DeliveryType; label: string }[] = [
  { id: "normal", label: "Normal" },
  { id: "assisted", label: "Assisted" },
  { id: "c-section", label: "C-section" },
]

export const CALVING_CALF_OPTIONS: { id: CalfStatus; label: string }[] = [
  { id: "live", label: "Live" },
  { id: "stillborn", label: "Stillborn" },
  { id: "unknown", label: "Unknown" },
]

export const CALVING_COMPLICATION_OPTIONS: { id: CalvingComplication; label: string }[] = [
  { id: "none", label: "None" },
  { id: "retained-placenta", label: "Retained placenta" },
  { id: "prolapse", label: "Prolapse" },
]


/** Draft state for the calving-event block inside the cattle log flow. */
export type CalvingEventDraft = {
  enabled: boolean
  stage: CalvingStage
  deliveryType: DeliveryType
  calfStatus: CalfStatus
  complications: CalvingComplication[]
}

export function emptyCalvingEventDraft(): CalvingEventDraft {
  return {
    enabled: false,
    stage: "in-labor",
    deliveryType: "normal",
    calfStatus: "live",
    complications: ["none"],
  }
}

/** Show the calving-event capture only for cattle currently in a pre-calving / labor state. */
export function isCattleCalvingEligible(cattle: Cattle): boolean {
  const s = getCalvingStatus(cattle)
  return s === "pregnant" || s === "calving-soon" || s === "in-labor" || s === "complications"
}

/**
 * Cattle field updates to apply on Finalize when a calving event is recorded.
 * Returns null when the toggle is off (no calving change).
 */
export function calvingEventCattleUpdate(draft: CalvingEventDraft): Partial<Cattle> | null {
  if (!draft.enabled) return null
  if (draft.stage === "in-labor") {
    return { calvingStatus: "in-labor", inLaborTimestamp: new Date().toISOString() }
  }
  const realComps = draft.complications.filter((c) => c !== "none")
  return {
    calvingStatus: "calved",
    calvingDate: new Date().toISOString().slice(0, 10),
    dueDate: null,
    deliveryType: draft.deliveryType,
    calfStatus: draft.calfStatus,
    calvingComplications: realComps,
    inLaborTimestamp: null,
  }
}
