import { cattleTagBare } from "@/lib/cattleUi"
import { isCattleCareDueSoon, type CattleCareDueKind } from "@/lib/cattleCareDue"
import {
  cattleEffectiveHealthBucket,
  getCattleLastObservationTime,
} from "@/lib/cattleSelectors"
import { getCalvingStatus, type EffectiveCalvingStatus } from "@/lib/calvingStatus"
import { compareNullableIsoDates } from "@/lib/rosterCareDate"
import {
  compareRosterLastActivityMs,
  ROSTER_LAST_ACTIVITY_URL_KEY,
  rosterLastActivityFromSearchParam,
} from "@/lib/rosterLastActivitySort"
import { ROSTER_SORT_COLUMN_URL_KEY, ROSTER_SORT_DIR_URL_KEY } from "@/lib/rosterSortUrl"
import type { Breed, Cattle } from "@/types/cattle"
import type { ObservationEntry } from "@/types/observation"

export type CattleSortKey =
  | "tag"
  | "breed"
  | "sex"
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

/** Herd roster: toolbar “last activity” and column sorts share this union. */
export type CattleRosterSortColumn = "lastObservation" | CattleSortKey

const CATTLE_ROSTER_SORT_COLUMNS = new Set<string>([
  "lastObservation",
  "tag",
  "breed",
  "sex",
  "age",
  "pasture",
  "dueDate",
  "calvingStatus",
  "healthStatus",
  "lastObs",
  "lastVax",
  "lastDeworm",
  "lastPregCheck",
  "lastBranding",
  "obsCount",
])

function defaultDirectionForCattleColumn(column: CattleRosterSortColumn): "asc" | "desc" {
  if (column === "lastObservation") return "desc"
  if (
    column === "lastVax" ||
    column === "lastDeworm" ||
    column === "lastPregCheck" ||
    column === "lastBranding" ||
    column === "lastObs"
  ) {
    return "desc"
  }
  return "asc"
}

export function cattleHerdRosterSortFromSearchParams(searchParams: URLSearchParams): {
  column: CattleRosterSortColumn
  direction: "asc" | "desc"
} {
  const rawCol = searchParams.get(ROSTER_SORT_COLUMN_URL_KEY)
  const rawDir = searchParams.get(ROSTER_SORT_DIR_URL_KEY)

  if (rawCol === "lastObservation") {
    const direction: "asc" | "desc" =
      rawDir === "asc" || rawDir === "desc"
        ? rawDir
        : rosterLastActivityFromSearchParam(searchParams.get(ROSTER_LAST_ACTIVITY_URL_KEY))
    return { column: "lastObservation", direction }
  }
  if (rawCol && CATTLE_ROSTER_SORT_COLUMNS.has(rawCol) && rawCol !== "lastObservation") {
    return { column: rawCol as CattleSortKey, direction: rawDir === "asc" ? "asc" : "desc" }
  }
  // Default: surface Flag then Monitor then Good (HEALTH_ORDER asc).
  return { column: "healthStatus", direction: "asc" }
}

export function applyCattleHerdRosterSortToSearchParams(
  params: URLSearchParams,
  sort: { column: CattleRosterSortColumn; direction: "asc" | "desc" },
) {
  const p = new URLSearchParams(params)
  if (sort.column === "lastObservation") {
    p.set(ROSTER_SORT_COLUMN_URL_KEY, "lastObservation")
    p.set(ROSTER_SORT_DIR_URL_KEY, sort.direction)
    const legacy = sort.direction === "asc" ? "oldest" : null
    if (legacy) p.set(ROSTER_LAST_ACTIVITY_URL_KEY, legacy)
    else p.delete(ROSTER_LAST_ACTIVITY_URL_KEY)
  } else {
    p.set(ROSTER_SORT_COLUMN_URL_KEY, sort.column)
    p.set(ROSTER_SORT_DIR_URL_KEY, sort.direction)
    p.delete(ROSTER_LAST_ACTIVITY_URL_KEY)
  }
  return p
}

export function nextCattleRosterSort(
  current: { column: CattleRosterSortColumn; direction: "asc" | "desc" },
  clicked: CattleRosterSortColumn,
): { column: CattleRosterSortColumn; direction: "asc" | "desc" } {
  if (current.column === clicked) {
    return { column: clicked, direction: current.direction === "asc" ? "desc" : "asc" }
  }
  return { column: clicked, direction: defaultDirectionForCattleColumn(clicked) }
}

export function cattleRosterSortTriggerLabel(sort: {
  column: CattleRosterSortColumn
  direction: "asc" | "desc"
}): string {
  if (sort.column === "lastObservation") {
    return sort.direction === "desc" ? "Newest first" : "Oldest first"
  }
  const az = sort.direction === "asc" ? "A–Z" : "Z–A"
  const num = sort.direction === "asc" ? "Low to high" : "High to low"
  const dates = sort.direction === "desc" ? "Newest first" : "Oldest first"
  switch (sort.column) {
    case "tag":
      return `Sorted by Tag # (${num})`
    case "breed":
      return `Sorted by Breed (${az})`
    case "sex":
      return `Sorted by Sex (${az})`
    case "age":
      return `Sorted by Age (${num})`
    case "pasture":
      return `Sorted by Pasture (${az})`
    case "dueDate":
      return `Sorted by Due date (${sort.direction === "asc" ? "Soonest first" : "Latest first"})`
    case "calvingStatus":
      return `Sorted by Calving status (${sort.direction === "asc" ? "Urgent first" : "Calved first"})`
    case "healthStatus":
      return `Sorted by Status (${sort.direction === "asc" ? "Flag first" : "Good first"})`
    case "lastObs":
      return `Sorted by Last obs (${dates})`
    case "lastVax":
      return `Sorted by Last vax (${dates})`
    case "lastDeworm":
      return `Sorted by Last deworm (${dates})`
    case "lastPregCheck":
      return `Sorted by Last preg check (${dates})`
    case "lastBranding":
      return `Sorted by Last branding (${dates})`
    case "obsCount":
      return `Sorted by Obs count (${num})`
    default:
      return "Sort"
  }
}

const HEALTH_ORDER: Record<"Flag" | "Monitor" | "Good", number> = {
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
  /** Herd roster: when non-empty and not the full catalog set, restrict to these pasture ids. */
  herdPastureIds?: ReadonlySet<string>
  /** Pasture ids in roster order; used with herdPastureIds to treat “all selected” as no filter. */
  herdPastureCatalog?: readonly string[]
  searchTrimmed: string
  breed: "all" | Breed
  /** Selected sex labels (e.g. "Bull", "Cow"); empty = no sex filter. Matched case-insensitively against `sexLabel`. */
  sexFilters?: Set<string>
  calvingFilters: Set<EffectiveCalvingStatus>
  healthFilters: Set<"Flag" | "Monitor" | "Good">
  dueWeekOnly?: boolean
  careDueKind?: CattleCareDueKind | null
  observationsByCattleId: Record<string, ObservationEntry[]>
}

export function filterCattleList(list: Cattle[], options: CattleRosterFilterOptions): Cattle[] {
  let result = list
  if (options.pastureId) {
    result = result.filter((c) => c.pastureId === options.pastureId)
  }
  const cat = options.herdPastureCatalog
  const herdIds = options.herdPastureIds
  if (cat && cat.length > 0 && herdIds) {
    const full = cat.every((id) => herdIds.has(id))
    const active = herdIds.size > 0 && !full
    if (active) {
      result = result.filter((c) => herdIds.has(c.pastureId))
    }
  }
  if (options.dueWeekOnly) {
    result = result.filter((c) => getCalvingStatus(c) === "calving-soon")
  }
  const q = cattleTagBare(options.searchTrimmed).toLowerCase()
  if (q) {
    result = result.filter((c) => cattleTagBare(c.tagNumber).toLowerCase().includes(q))
  }
  if (options.breed !== "all") {
    result = result.filter((c) => c.breed === options.breed)
  }
  // Empty selection = no filter applied (all rows pass for that category).
  if (options.sexFilters && options.sexFilters.size > 0) {
    const wanted = new Set(Array.from(options.sexFilters, (s) => s.trim().toLowerCase()))
    result = result.filter((c) => wanted.has((c.sexLabel ?? "").trim().toLowerCase()))
  }
  if (options.calvingFilters.size > 0) {
    result = result.filter((c) => options.calvingFilters.has(getCalvingStatus(c)))
  }
  if (options.healthFilters.size > 0) {
    result = result.filter((c) => {
      const h = cattleEffectiveHealthBucket(c, options.observationsByCattleId)
      return options.healthFilters.has(h)
    })
  }
  const careDueKind = options.careDueKind
  if (careDueKind) {
    result = result.filter((c) => isCattleCareDueSoon(c, careDueKind))
  }
  return result
}

export function sortCattleList(
  rows: Cattle[],
  sort: { column: CattleRosterSortColumn; direction: "asc" | "desc" },
  pastureNames: Record<string, string>,
  observationsByCattleId: Record<string, ObservationEntry[]>,
): Cattle[] {
  const { column, direction: dir } = sort
  const mult = dir === "asc" ? 1 : -1

  return [...rows].sort((a, b) => {
    let cmp = 0
    if (column === "lastObservation") {
      const ta = getCattleLastObservationTime(a.id, observationsByCattleId)
      const tb = getCattleLastObservationTime(b.id, observationsByCattleId)
      cmp = compareRosterLastActivityMs(ta, tb, dir)
    } else {
      const key = column
      switch (key) {
        case "tag":
          cmp = tagSortKey(a.tagNumber) - tagSortKey(b.tagNumber)
          break
        case "breed":
          cmp = a.breed.localeCompare(b.breed, undefined, { sensitivity: "base" })
          break
        case "sex":
          cmp = (a.sexLabel ?? "").localeCompare(b.sexLabel ?? "", undefined, { sensitivity: "base" })
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
          const ha = HEALTH_ORDER[cattleEffectiveHealthBucket(a, observationsByCattleId)]
          const hb = HEALTH_ORDER[cattleEffectiveHealthBucket(b, observationsByCattleId)]
          cmp = ha - hb
          break
        }
        case "lastObs": {
          const ta = getCattleLastObservationTime(a.id, observationsByCattleId)
          const tb = getCattleLastObservationTime(b.id, observationsByCattleId)
          const va = ta === null ? Number.POSITIVE_INFINITY : ta
          const vb = tb === null ? Number.POSITIVE_INFINITY : tb
          cmp = va - vb
          break
        }
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
          cmp = (observationsByCattleId[a.id] ?? []).length - (observationsByCattleId[b.id] ?? []).length
          break
        default:
          break
      }
      if (cmp !== 0) return CATTLE_CARE_DATE_SORT_KEYS.has(key) ? cmp : mult * cmp
    }
    if (cmp !== 0) return cmp
    return a.tagNumber.localeCompare(b.tagNumber, undefined, { sensitivity: "base" })
  })
}
