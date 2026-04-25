import type { AIResult } from "@/types/observation"

/** Shared shape with horse observations (category casing matches `ObservationEntry`). */
export interface CattleObservation {
  id: string
  date: string
  category: "Health" | "Behavior" | "Feeding" | "Calving"
  notes: string
  loggedBy: string
  aiResult?: AIResult
}

export type PastureType = "first-timers" | "experienced" | "bulls"

export interface Pasture {
  id: string
  name: string
  type: PastureType
  animalCount: number
  /** @deprecated Prefer last-check display; kept for seed fallbacks. */
  lastObservation?: string
  /** ISO timestamp of the most recent pasture check (derived). */
  lastCheckDate?: string
}

export const BREED_OPTIONS = [
  "Angus",
  "Hereford",
  "Charolais",
  "Simmental",
  "Brahman",
  "Limousin",
  "Red Angus",
  "Shorthorn",
  "Highland",
  "Longhorn",
  "Mixed",
  "Other",
] as const
export type Breed = (typeof BREED_OPTIONS)[number]

/** Persisted on the animal. Auto `pregnant` may become `calving-soon` in `getCalvingStatus()` when due within 14 days. */
export type StoredCalvingStatus = "pregnant" | "in-labor" | "calved" | "complications" | "none"

/** Effective calving state for UI (includes auto-derived urgency). */
export type EffectiveCalvingStatus =
  | "pregnant"
  | "calving-soon"
  | "in-labor"
  | "calved"
  | "complications"
  | "none"

export type DeliveryType = "normal" | "assisted" | "c-section"
export type CalfStatus = "live" | "stillborn" | "unknown"
export type CalvingComplication = "none" | "retained-placenta" | "prolapse" | "hemorrhage"

export type CattleInventoryStatus = "active" | "deceased" | "sold" | "quarantined"

export interface CalvingRecord {
  cattleId: string
  date: string
  deliveryType: DeliveryType
  calfStatus: CalfStatus
  complications: CalvingComplication[]
  notes?: string
  loggedBy: string
  /** When opened from complications follow-up, always save as `complications` status. */
  forceComplicationsOutcome?: boolean
}

export interface Cattle {
  id: string
  tagNumber: string
  breed: Breed
  age: number
  pastureId: string
  dueDate?: string | null
  calvingStatus: StoredCalvingStatus
  calvingDate?: string | null
  /** Set when user marks in labor (ISO). */
  inLaborTimestamp?: string | null
  deliveryType?: DeliveryType | null
  calfStatus?: CalfStatus | null
  calvingComplications?: CalvingComplication[]
  /** AI follow-up from the most recent calving flow (mirrors observation `aiResult` for detail UI). */
  calvingAiResult?: AIResult | null
  healthStatus?: "Flag" | "Monitor" | "Good"
  lastObservation?: string
  observations?: CattleObservation[]
  /** Optional display name from Add animal. */
  displayName?: string
  sexLabel?: string
  dateOfBirthIso?: string
  weightLbs?: number
  inventoryStatus?: CattleInventoryStatus
  notes?: string
  dateOfDeath?: string
  saleDate?: string
  buyer?: string
  /** ISO date (YYYY-MM-DD); home care pills & `?careDue=` roster filter when due within app window. */
  vaccinationDueIso?: string | null
  dewormingDueIso?: string | null
  pregnancyCheckDueIso?: string | null
  brandingDueIso?: string | null
  /** Last completed vaccination (ISO date); null if not logged. */
  lastVaccinationAt?: string | null
  /** Last completed deworming (ISO date); null if not logged. */
  lastDewormingAt?: string | null
  /** Last pregnancy check for breeding females; null for bulls/steers or not logged. */
  lastPregnancyCheckAt?: string | null
  /** Last branding event; null until applicable / not logged. */
  lastBrandingAt?: string | null
}

export interface PastureCheck {
  id: string
  pastureId: string
  date: string
  loggedBy: string
  allClear: boolean
  /** Optional when `allClear`; required in the modal when not all clear. */
  notes?: string
  /**
   * Future (AI): IDs of individual animal observations created or linked from this check.
   * See product spec — entity extraction from pasture check notes, pattern surfacing, etc.
   */
  linkedObservationIds?: string[]
}
