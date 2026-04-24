import { differenceInDays, parseISO } from "date-fns"
import type { Cattle } from "@/types/cattle"

/** Count an animal as “due” when on or before this many days from today (includes overdue). */
export const CATTLE_CARE_DUE_WINDOW_DAYS = 30

export type CattleCareDueKind = "vaccination" | "deworming" | "pregnancy-check" | "branding"

const DUE_FIELD: Record<CattleCareDueKind, keyof Cattle> = {
  vaccination: "vaccinationDueIso",
  deworming: "dewormingDueIso",
  "pregnancy-check": "pregnancyCheckDueIso",
  branding: "brandingDueIso",
}

export const CATTLE_CARE_DUE_PARAM_VALUES = new Set<string>([
  "vaccination",
  "deworming",
  "pregnancy-check",
  "branding",
])

export function parseCattleCareDueParam(raw: string | null): CattleCareDueKind | null {
  if (!raw || !CATTLE_CARE_DUE_PARAM_VALUES.has(raw)) return null
  return raw as CattleCareDueKind
}

function dueDayString(iso: string | null | undefined): string | null {
  if (!iso) return null
  return iso.includes("T") ? iso.slice(0, 10) : iso
}

export function isCattleCareDueSoonForField(iso: string | null | undefined): boolean {
  const day = dueDayString(iso)
  if (!day) return false
  try {
    const d = differenceInDays(parseISO(day), new Date())
    return d <= CATTLE_CARE_DUE_WINDOW_DAYS
  } catch {
    return false
  }
}

export function isCattleCareDueSoon(c: Cattle, kind: CattleCareDueKind): boolean {
  const iso = c[DUE_FIELD[kind]] as string | null | undefined
  return isCattleCareDueSoonForField(iso)
}

export function countCattleCareDue(cattle: readonly Cattle[], kind: CattleCareDueKind): number {
  return cattle.filter((c) => isCattleCareDueSoon(c, kind)).length
}
