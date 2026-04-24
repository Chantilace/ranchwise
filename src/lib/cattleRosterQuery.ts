import { isCattleCareDueSoon, type CattleCareDueKind } from "@/lib/cattleCareDue"
import { getCalvingStatus, type EffectiveCalvingStatus } from "@/lib/calvingStatus"
import { compareNullableIsoDates } from "@/lib/rosterCareDate"
import type { Breed, Cattle } from "@/types/cattle"

export type CattleSortKey =
  | "tag"
  | "breed"
  | "age"
  | "pasture"
  | "dueDate"
  | "calvingStatus"
  | "healthStatus"
  | "lastObs"
  | "lastVax"
  | "lastDeworm"
  | "lastPregCheck"
  | "lastBranding"
  | "obsCount"

const HEALTH_ORDER: Record<string, number> = {
  Flag: 0,
  Monitor: 1,
  Good: 2,
}

const CATTLE_CARE_DATE_SORT_KEYS = new Set<CattleSortKey>([
  "lastVax",
  "lastDeworm",
  "lastPregCheck",
  "lastBranding",
])

const CALVING_ORDER: Record<EffectiveCalvingStatus, number> = {
  complications: 0,
  "calving-soon": 1,
  "in-labor": 2,
  pregnant: 3,
  calved: 4,
  none: 5,
}

export function tagSortKey(tag: string) {
  const n = Number.parseInt(tag.replace(/\D/g, ""), 10)
  return Number.isFinite(n) ? n : 0
}

export type CattleRosterFilterOptions = {
  pastureId?: string
  searchTrimmed: string
  breed: "all" | Breed
  calvingFilters: Set<EffectiveCalvingStatus>
  healthFilters: Set<"Flag" | "Monitor" | "Good">
  dueWeekOnly?: boolean
  careDueKind?: CattleCareDueKind | null
}

export function filterCattleList(list: Cattle[], options: CattleRosterFilterOptions): Cattle[] {
  let result = list
  if (options.pastureId) {
    result = result.filter((c) => c.pastureId === options.pastureId)
  }
  if (options.dueWeekOnly) {
    result = result.filter((c) => getCalvingStatus(c) === "calving-soon")
  }
  const q = options.searchTrimmed.toLowerCase().replace(/^#/, "")
  if (q) {
    result = result.filter((c) => c.tagNumber.toLowerCase().replace(/^#/, "").includes(q))
  }
  if (options.breed !== "all") {
    result = result.filter((c) => c.breed === options.breed)
  }
  if (options.calvingFilters.size === 0 || options.healthFilters.size === 0) {
    return []
  }
  result = result.filter((c) => options.calvingFilters.has(getCalvingStatus(c)))
  result = result.filter((c) => {
    const h = c.healthStatus ?? "Good"
    return options.healthFilters.has(h)
  })
  if (options.careDueKind) {
    result = result.filter((c) => isCattleCareDueSoon(c, options.careDueKind))
  }
  return result
}

export function sortCattleList(
  rows: Cattle[],
  key: CattleSortKey,
  dir: "asc" | "desc",
  pastureNames: Record<string, string>
): Cattle[] {
  const mult = dir === "asc" ? 1 : -1
  return [...rows].sort((a, b) => {
    let cmp = 0
    switch (key) {
      case "tag":
        cmp = tagSortKey(a.tagNumber) - tagSortKey(b.tagNumber)
        break
      case "breed":
        cmp = a.breed.localeCompare(b.breed, undefined, { sensitivity: "base" })
        break
      case "age":
        cmp = a.age - b.age
        break
      case "pasture": {
        const na = pastureNames[a.pastureId] ?? a.pastureId
        const nb = pastureNames[b.pastureId] ?? b.pastureId
        cmp = na.localeCompare(nb, undefined, { sensitivity: "base" })
        break
      }
      case "dueDate": {
        const da = a.dueDate ?? ""
        const db = b.dueDate ?? ""
        cmp = da.localeCompare(db)
        break
      }
      case "calvingStatus":
        cmp = CALVING_ORDER[getCalvingStatus(a)] - CALVING_ORDER[getCalvingStatus(b)]
        break
      case "healthStatus": {
        const ha = HEALTH_ORDER[a.healthStatus ?? "Good"] ?? 2
        const hb = HEALTH_ORDER[b.healthStatus ?? "Good"] ?? 2
        cmp = ha - hb
        break
      }
      case "lastObs":
        cmp = (a.lastObservation ?? "").localeCompare(b.lastObservation ?? "", undefined, {
          sensitivity: "base",
        })
        break
      case "lastVax":
        cmp = compareNullableIsoDates(a.lastVaccinationAt, b.lastVaccinationAt, dir)
        break
      case "lastDeworm":
        cmp = compareNullableIsoDates(a.lastDewormingAt, b.lastDewormingAt, dir)
        break
      case "lastPregCheck":
        cmp = compareNullableIsoDates(a.lastPregnancyCheckAt, b.lastPregnancyCheckAt, dir)
        break
      case "lastBranding":
        cmp = compareNullableIsoDates(a.lastBrandingAt, b.lastBrandingAt, dir)
        break
      case "obsCount":
        cmp = (a.observations?.length ?? 0) - (b.observations?.length ?? 0)
        break
      default:
        break
    }
    if (cmp !== 0) return CATTLE_CARE_DATE_SORT_KEYS.has(key) ? cmp : mult * cmp
    return a.tagNumber.localeCompare(b.tagNumber, undefined, { sensitivity: "base" })
  })
}
