import type { Dispatch, SetStateAction } from "react"
import { FilterPanelRadioRow } from "@/components/workspace/FilterPanelRadioRow"
import { filterPanelTitleClass } from "@/components/workspace/filterPanelStyles"

/** Figma 85:4643 — Sort (single-select, no footer actions). */
export function PastureCheckSortPanel({
  dateSortDir,
  setDateSortDir,
}: {
  dateSortDir: "desc" | "asc"
  setDateSortDir: Dispatch<SetStateAction<"desc" | "asc">>
}) {
  return (
    <div className="flex flex-col gap-0.5">
      <p className={filterPanelTitleClass}>Sort</p>
      <FilterPanelRadioRow
        name="pasture-check-date-sort"
        checked={dateSortDir === "desc"}
        onSelect={() => setDateSortDir("desc")}
      >
        Date · Newest first
      </FilterPanelRadioRow>
      <FilterPanelRadioRow
        name="pasture-check-date-sort"
        checked={dateSortDir === "asc"}
        onSelect={() => setDateSortDir("asc")}
      >
        Date · Oldest first
      </FilterPanelRadioRow>
    </div>
  )
}
