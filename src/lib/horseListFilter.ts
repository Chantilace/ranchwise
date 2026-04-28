import type { HorseTableRow } from "@/components/RanchWiseHorseRoster"

/** URL query: land roster with health Good + behavior Good + role Working (homepage “fit for work”). */
export const HORSE_ROSTER_FIT_FOR_WORK_FILTER_PARAM = "fitForWork" as const

/** Same predicate as the homepage horse card “fit for work” count and avatars. */
export function isHorseFitForWorkRow(h: HorseTableRow): boolean {
  return h.role.trim() === "Working" && h.healthStatus === "good" && h.behaviorStatus === "good"
}

/** Roster corral filter options (matches common `pasture` labels on horse rows). */
export const HORSE_CORRAL_FILTER_IDS = ["Main", "Training", "Breeding", "Juvenile"] as const

export const HORSE_ROLE_FILTER_IDS = ["Working", "Training", "Juvenile", "Breeding"] as const

export type HorseListFilter = {
  searchTrimmed: string
  /** Health status: empty = no filter (same semantics as cattle roster). */
  statusFilters: Set<"flag" | "monitor" | "good">
  /** Behavior roster status (`HorseTableRow.behaviorStatus`); empty = no filter. AND with health when both set. */
  behaviorStatusFilters: Set<"flag" | "monitor" | "good">
  /** Role: empty = no filter. */
  roleFilters: Set<string>
  /** Corral (pasture field): empty = no filter. */
  corralFilters: Set<string>
  /** Full option catalogs (for partial vs none detection). */
  roleCatalog: readonly string[]
  corralCatalog: readonly string[]
}

export function filterHorseList(rows: HorseTableRow[], f: HorseListFilter): HorseTableRow[] {
  const q = f.searchTrimmed.trim().toLowerCase()

  return rows.filter((r) => {
    if (q && !r.name.toLowerCase().includes(q)) return false

    if (f.statusFilters.size > 0) {
      if (!f.statusFilters.has(r.healthStatus)) return false
    }

    if (f.behaviorStatusFilters.size > 0) {
      if (!f.behaviorStatusFilters.has(r.behaviorStatus)) return false
    }

    if (f.roleCatalog.length > 0 && f.roleFilters.size > 0) {
      if (f.roleFilters.size < f.roleCatalog.length && !f.roleFilters.has(r.role.trim())) return false
    }

    if (f.corralCatalog.length > 0 && f.corralFilters.size > 0) {
      const p = r.pasture.trim()
      if (f.corralFilters.size < f.corralCatalog.length && !f.corralFilters.has(p)) return false
    }

    return true
  })
}
