import type { Dispatch, SetStateAction } from "react"
import { useMemo, useState } from "react"
import { Separator } from "@/components/ui/separator"
import { MenuRadioSelectField } from "@/components/ui/menu-multi-select-field"
import { CALVING_FILTER_OPTIONS, type EffectiveCalvingStatus } from "@/lib/calvingStatus"
import { calvingFilterSwatchById, healthFilterSwatchById } from "@/lib/filterOptionSwatches"
import { BREED_OPTIONS, type Breed } from "@/types/cattle"
import { FilterPanelSearch } from "@/components/workspace/FilterPanelSearch"
import {
  RanchFilterCategoryField,
  type RanchFilterOption,
} from "@/components/workspace/RanchFilterCategoryField"
import {
  filterPanelFooterButtonRowClass,
  filterPanelResetButtonClass,
  filterPanelTitleClass,
  filterPanelApplyButtonClass,
} from "@/components/workspace/filterPanelStyles"

const HEALTH_OPTIONS = (["Flag", "Monitor", "Good"] as const).map((h) => ({ id: h, label: h }))

const BREED_MENU_OPTIONS: { id: string; label: string }[] = [
  { id: "all", label: "All" },
  ...BREED_OPTIONS.map((b) => ({ id: b, label: b })),
]

export type CattleFilterPanelProps = {
  showSearch?: boolean
  searchValue: string
  onSearchChange: (v: string) => void
  calvingFilters: Set<EffectiveCalvingStatus>
  setCalvingFilters: Dispatch<SetStateAction<Set<EffectiveCalvingStatus>>>
  healthFilters: Set<"Flag" | "Monitor" | "Good">
  setHealthFilters: Dispatch<SetStateAction<Set<"Flag" | "Monitor" | "Good">>>
  breedFilter: "all" | Breed
  setBreedFilter: (b: "all" | Breed) => void
  showBreedSection?: boolean
  onReset: () => void
  onApply: () => void
}

/** Cattle filter panel — shared RanchWise category fields + breed + Reset / Apply. */
export function CattleFilterPanel({
  showSearch = true,
  searchValue,
  onSearchChange,
  calvingFilters,
  setCalvingFilters,
  healthFilters,
  setHealthFilters,
  breedFilter,
  setBreedFilter,
  showBreedSection = true,
  onReset,
  onApply,
}: CattleFilterPanelProps) {
  const [expandedId, setExpandedId] = useState<string | null>(null)
  const toggleCategory = (id: string) => setExpandedId((cur) => (cur === id ? null : id))

  const calvingOptions: RanchFilterOption[] = useMemo(
    () =>
      CALVING_FILTER_OPTIONS.map((o) => ({
        id: o.id,
        label: o.label,
        swatchClassName: calvingFilterSwatchById[o.id],
      })),
    []
  )

  const healthOptions: RanchFilterOption[] = useMemo(
    () =>
      HEALTH_OPTIONS.map((o) => ({
        id: o.id,
        label: o.label,
        swatchClassName: healthFilterSwatchById[o.id],
      })),
    []
  )

  const calvingSelectedIds = useMemo(() => new Set<string>(calvingFilters), [calvingFilters])
  const healthSelectedIds = useMemo(() => new Set<string>(healthFilters), [healthFilters])

  return (
    <div className="flex flex-col gap-3">
      <p className={filterPanelTitleClass}>Filters</p>

      {showSearch ? (
        <FilterPanelSearch
          value={searchValue}
          onChange={onSearchChange}
          ariaLabel="Search pastures and cattle"
        />
      ) : null}

      <RanchFilterCategoryField
        sectionLabel="Calving status"
        options={calvingOptions}
        selectedIds={calvingSelectedIds}
        onChange={(next) => setCalvingFilters(new Set([...next] as EffectiveCalvingStatus[]))}
        expanded={expandedId === "calving"}
        onToggleExpand={() => toggleCategory("calving")}
        aria-label="Calving status filters"
      />

      <RanchFilterCategoryField
        sectionLabel="Health"
        options={healthOptions}
        selectedIds={healthSelectedIds}
        onChange={(next) => setHealthFilters(new Set([...next] as ("Flag" | "Monitor" | "Good")[]))}
        expanded={expandedId === "health"}
        onToggleExpand={() => toggleCategory("health")}
        aria-label="Health filters"
      />

      {showBreedSection ? (
        <MenuRadioSelectField
          sectionLabel="Breed"
          options={BREED_MENU_OPTIONS}
          value={breedFilter === "all" ? "all" : breedFilter}
          onChange={(id) => setBreedFilter(id === "all" ? "all" : (id as Breed))}
          placeholder="All breeds"
          clearValueId="all"
          aria-label="Breed filter"
        />
      ) : null}

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
