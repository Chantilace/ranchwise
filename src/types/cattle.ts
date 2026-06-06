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
  /** Profile / roster hero image. */
  profileImageUrl?: string
  /** Short terrain label (e.g. "Sage-scrub"). */
  terrain: string
  acreage: number
  waterSource: string
  fenceStatus: string
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

/** Canonical cattle sex labels (shared by the Add Cattle form, roster filter, and column). */
export const CATTLE_SEX_OPTIONS = ["Bull", "Cow", "Heifer", "Steer", "Calf"] as const
export type CattleSexLabel = (typeof CATTLE_SEX_OPTIONS)[number]

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
  /**
   * Seed / pre-AI hint only. Authoritative health for UI comes from
   * `getCattleDisplayHealth` / `getCattleEffectiveHealthRisk` + `observationsByCattleId`.
   */
  healthStatus?: "Flag" | "Monitor" | "Good"
  /** @deprecated Prefer `getCattleLastObservationLabel` from `@/lib/cattleSelectors` + observation map. */
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
