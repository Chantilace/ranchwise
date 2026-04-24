import type { HorseTableRow } from "@/components/HeguyRanchCoPilot"

const SEX_CATALOG = ["Mare", "Gelding", "Stallion"] as const

function isFullSelection(selected: ReadonlySet<string>, catalog: readonly string[]): boolean {
  if (catalog.length === 0) return true
  return catalog.every((id) => selected.has(id))
}

export type HorseListFilter = {
  searchTrimmed: string
  statusFilters: Set<"flag" | "monitor" | "good"> // health
  behaviorStatusFilters: Set<"flag" | "monitor" | "good">
  pastureFilters: Set<string>
  sexFilters: Set<string>
  /** Uniq pasture names used to detect “all pastures” default. */
  pastureNamesCatalog: readonly string[]
}

export function filterHorseList(rows: HorseTableRow[], f: HorseListFilter): HorseTableRow[] {
  const q = f.searchTrimmed.trim().toLowerCase()
  const sexCatalog = [...SEX_CATALOG]

  return rows.filter((r) => {
    if (q && !r.name.toLowerCase().includes(q)) return false

    if (f.statusFilters.size < 3 && !f.statusFilters.has(r.healthStatus)) return false

    if (
      f.behaviorStatusFilters.size > 0 &&
      f.behaviorStatusFilters.size < 3 &&
      !f.behaviorStatusFilters.has(r.behaviorStatus)
    ) {
      return false
    }

    if (f.pastureNamesCatalog.length > 0) {
      if (!isFullSelection(f.pastureFilters, f.pastureNamesCatalog)) {
        if (f.pastureFilters.size === 0) return false
        if (!f.pastureFilters.has(r.pasture.trim())) return false
      }
    }

    if (!isFullSelection(f.sexFilters, sexCatalog)) {
      if (f.sexFilters.size === 0) return false
      if (!f.sexFilters.has(r.sex.trim())) return false
    }

    return true
  })
}
