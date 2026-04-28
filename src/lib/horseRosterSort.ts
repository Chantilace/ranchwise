import { compareNullableIsoDates } from "@/lib/rosterCareDate"
import {
  compareRosterLastActivityMs,
  getHorseLastObservationTimeMs,
  ROSTER_LAST_ACTIVITY_URL_KEY,
  rosterLastActivityFromSearchParam,
} from "@/lib/rosterLastActivitySort"
import { ROSTER_SORT_COLUMN_URL_KEY, ROSTER_SORT_DIR_URL_KEY } from "@/lib/rosterSortUrl"
import { parseObservationDate } from "@/lib/initialObservations"
import type { ObservationEntry } from "@/types/observation"

/** Minimal row shape for sorting (matches {@link HorseTableRow} fields used in comparators). */
export type HorseRosterSortRow = {
  id?: number | string
  name: string
  age: string
  sex: string
  role: string
  pasture: string
  feed: string[]
  health: string
  dental: string
  healthStatus: "flag" | "good" | "monitor"
  behaviorStatus: "flag" | "good" | "monitor"
  lastFarrier?: string | null
  lastFarrierDate?: string | null
  lastDentalDate?: string | null
}

export type HorseSortKey =
  | "name"
  | "healthStatus"
  | "behaviorStatus"
  | "age"
  | "sex"
  | "role"
  | "feed"
  | "health"
  | "dental"
  | "farrier"
  | "pasture"

export type HorseRosterSortColumn = "lastObservation" | HorseSortKey

const HORSE_SORT_KEYS = new Set<string>([
  "name",
  "healthStatus",
  "behaviorStatus",
  "age",
  "sex",
  "role",
  "feed",
  "health",
  "dental",
  "farrier",
  "pasture",
])

const HORSE_CARE_DATE_SORT_KEYS = new Set<HorseSortKey>(["farrier", "dental"])

function parseAgeYears(age: string): number {
  const m = age.trim().match(/^(\d+)/)
  return m ? Number(m[1]) : 0
}

const HERD_STATUS_SORT_ORDER: Record<HorseRosterSortRow["healthStatus"], number> = {
  flag: 0,
  monitor: 1,
  good: 2,
}

function defaultDirectionForHorseColumn(column: HorseRosterSortColumn): "asc" | "desc" {
  if (column === "lastObservation") return "desc"
  if (column === "health" || column === "dental" || column === "farrier") return "desc"
  return "asc"
}

export function horseRosterSortFromSearchParams(searchParams: URLSearchParams): {
  column: HorseRosterSortColumn
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
  if (rawCol && HORSE_SORT_KEYS.has(rawCol)) {
    return { column: rawCol as HorseSortKey, direction: rawDir === "asc" ? "asc" : "desc" }
  }
  return {
    column: "lastObservation",
    direction: rosterLastActivityFromSearchParam(searchParams.get(ROSTER_LAST_ACTIVITY_URL_KEY)),
  }
}

export function applyHorseRosterSortToSearchParams(
  params: URLSearchParams,
  sort: { column: HorseRosterSortColumn; direction: "asc" | "desc" },
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

export function nextHorseRosterSort(
  current: { column: HorseRosterSortColumn; direction: "asc" | "desc" },
  clicked: HorseSortKey,
): { column: HorseRosterSortColumn; direction: "asc" | "desc" } {
  if (current.column === clicked) {
    return {
      column: clicked,
      direction: current.direction === "asc" ? "desc" : "asc",
    }
  }
  return { column: clicked, direction: defaultDirectionForHorseColumn(clicked) }
}

export function horseRosterSortTriggerLabel(sort: {
  column: HorseRosterSortColumn
  direction: "asc" | "desc"
}): string {
  if (sort.column === "lastObservation") {
    return sort.direction === "desc" ? "Newest first" : "Oldest first"
  }
  const dirLabel = sort.direction === "asc" ? "A–Z" : "Z–A"
  const dirLabelNumeric = sort.direction === "asc" ? "Low to high" : "High to low"
  const dirLabelDates = sort.direction === "desc" ? "Newest first" : "Oldest first"
  switch (sort.column) {
    case "name":
      return `Sorted by Name (${dirLabel})`
    case "healthStatus":
      return `Sorted by Health (${sort.direction === "asc" ? "Flag first" : "Good first"})`
    case "behaviorStatus":
      return `Sorted by Behavior (${sort.direction === "asc" ? "Flag first" : "Good first"})`
    case "age":
      return `Sorted by Age (${dirLabelNumeric})`
    case "sex":
      return `Sorted by Sex (${dirLabel})`
    case "role":
      return `Sorted by Role (${dirLabel})`
    case "feed":
      return `Sorted by Feed (${dirLabel})`
    case "health":
      return `Sorted by Last health log (${dirLabelDates})`
    case "dental":
      return `Sorted by Last dental (${dirLabelDates})`
    case "farrier":
      return `Sorted by Last farrier (${dirLabelDates})`
    case "pasture":
      return `Sorted by Pasture (${dirLabel})`
    default:
      return "Sort"
  }
}

export function sortHorseRowsUnified<T extends HorseRosterSortRow>(
  rows: readonly T[],
  sort: { column: HorseRosterSortColumn; direction: "asc" | "desc" },
  observationsByHorse: Record<string, ObservationEntry[]>,
): T[] {
  const { column, direction: dir } = sort
  const mult = dir === "asc" ? 1 : -1

  return [...rows].sort((a, b) => {
    let cmp = 0
    if (column === "lastObservation") {
      cmp = compareRosterLastActivityMs(
        getHorseLastObservationTimeMs(a, observationsByHorse),
        getHorseLastObservationTimeMs(b, observationsByHorse),
        dir,
      )
    } else {
      switch (column) {
        case "name":
          cmp = a.name.localeCompare(b.name, undefined, { sensitivity: "base" })
          break
        case "healthStatus":
          cmp = HERD_STATUS_SORT_ORDER[a.healthStatus] - HERD_STATUS_SORT_ORDER[b.healthStatus]
          break
        case "behaviorStatus":
          cmp = HERD_STATUS_SORT_ORDER[a.behaviorStatus] - HERD_STATUS_SORT_ORDER[b.behaviorStatus]
          break
        case "age":
          cmp = parseAgeYears(a.age) - parseAgeYears(b.age)
          break
        case "sex":
          cmp = a.sex.localeCompare(b.sex, undefined, { sensitivity: "base" })
          break
        case "role":
          cmp = a.role.localeCompare(b.role, undefined, { sensitivity: "base" })
          break
        case "feed": {
          const fa = a.feed.join(" / ")
          const fb = b.feed.join(" / ")
          cmp = fa.localeCompare(fb, undefined, { sensitivity: "base" })
          break
        }
        case "health":
          cmp = parseObservationDate(a.health) - parseObservationDate(b.health)
          break
        case "dental":
          cmp = compareNullableIsoDates(a.lastDentalDate, b.lastDentalDate, dir)
          break
        case "farrier":
          cmp = compareNullableIsoDates(a.lastFarrier ?? a.lastFarrierDate, b.lastFarrier ?? b.lastFarrierDate, dir)
          break
        case "pasture":
          cmp = a.pasture.localeCompare(b.pasture, undefined, { sensitivity: "base" })
          break
        default:
          break
      }
      if (cmp !== 0) return HORSE_CARE_DATE_SORT_KEYS.has(column) ? cmp : mult * cmp
    }
    if (cmp !== 0) return cmp
    return a.name.localeCompare(b.name, undefined, { sensitivity: "base" })
  })
}
