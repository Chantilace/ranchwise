import type { Dispatch, SetStateAction } from "react"
import { Separator } from "@/components/ui/separator"
import { FilterPanelRadioRow } from "@/components/workspace/FilterPanelRadioRow"
import {
  filterPanelApplyButtonClass,
  filterPanelFooterButtonRowClass,
  filterPanelResetButtonClass,
  filterPanelTitleClass,
} from "@/components/workspace/filterPanelStyles"

export type PastureCheckStatusFilter = "all" | "clear" | "attention"

/** Figma 85:4528 — Pasture logs filters (radio rows + Reset / Apply). */
export function PastureCheckFilterPanel({
  statusFilter,
  setStatusFilter,
  onReset,
  onApply,
}: {
  statusFilter: PastureCheckStatusFilter
  setStatusFilter: Dispatch<SetStateAction<PastureCheckStatusFilter>>
  onReset: () => void
  onApply: () => void
}) {
  return (
    <div className="flex flex-col gap-3">
      <p className={filterPanelTitleClass}>Filters</p>

      <FilterPanelRadioRow
        name="pasture-check-status-filter"
        checked={statusFilter === "all"}
        onSelect={() => setStatusFilter("all")}
      >
        All
      </FilterPanelRadioRow>
      <FilterPanelRadioRow
        name="pasture-check-status-filter"
        checked={statusFilter === "clear"}
        onSelect={() => setStatusFilter("clear")}
      >
        Clear
      </FilterPanelRadioRow>
      <FilterPanelRadioRow
        name="pasture-check-status-filter"
        checked={statusFilter === "attention"}
        onSelect={() => setStatusFilter("attention")}
      >
        Needs attention
      </FilterPanelRadioRow>

      <Separator />

      <div className={filterPanelFooterButtonRowClass}>
        <button type="button" className={filterPanelResetButtonClass} onClick={onReset}>
          Reset
        </button>
        <button type="button" className={filterPanelApplyButtonClass} onClick={onApply}>
          Apply
        </button>
      </div>
    </div>
  )
}
