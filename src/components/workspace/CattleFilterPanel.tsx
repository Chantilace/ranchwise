import type { Dispatch, SetStateAction } from "react"
import { useCallback, useMemo } from "react"
import { CALVING_FILTER_OPTIONS, type EffectiveCalvingStatus } from "@/lib/calvingStatus"
import { BREED_OPTIONS, type Breed } from "@/types/cattle"
import { SearchField } from "@/components/ui/search-field"
import type { RanchFilterOption } from "@/components/workspace/RanchFilterCategoryField"
import {
  EntityFilterPanel,
  type EntityFilterDimension,
} from "@/components/workspace/EntityFilterPanel"
import {
  filterPanelFooterButtonRowClass,
  filterPanelResetButtonClass,
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
  /** Herd roster only: pasture checklist (no swatches). Omit on single-pasture pages. */
  pastureFilterOptions?: readonly RanchFilterOption[]
  pastureFilters?: Set<string>
  setPastureFilters?: Dispatch<SetStateAction<Set<string>>>
  showCalvingStatusSection?: boolean
  /** Pasture roster: keep Reset / Apply. Cattle overview omits the footer. */
  showFooter?: boolean
  onReset?: () => void
  onApply?: () => void
}

function normalizePastureFiltersFromUi(next: Set<string>, catalogIds: readonly string[]): Set<string> {
  if (catalogIds.length === 0) return new Set()
  return new Set(next)
}

/** Cattle filter panel — labeled menu multi-selects + optional breed radio + optional Reset / Apply. */
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
  pastureFilterOptions,
  pastureFilters,
  setPastureFilters,
  showCalvingStatusSection = true,
  showFooter = true,
  onReset,
  onApply,
}: CattleFilterPanelProps) {
  const calvingMenuOptions = useMemo(
    () =>
      CALVING_FILTER_OPTIONS.map((o) => ({
        id: o.id,
        label: o.id === "none" ? "Open" : o.label,
      })),
    []
  )

  const healthMenuOptions = useMemo(
    () => HEALTH_OPTIONS.map((o) => ({ id: o.id, label: o.label })),
    []
  )

  const pastureMenuOptions = useMemo(() => {
    if (!pastureFilterOptions?.length) return [] as { id: string; label: string }[]
    return pastureFilterOptions.map((o) => ({ id: o.id, label: o.label }))
  }, [pastureFilterOptions])

  const catalogIds = useMemo(
    () => (pastureFilterOptions ?? []).map((o) => o.id),
    [pastureFilterOptions]
  )

  const pastureUiSelectedIds = useMemo(() => {
    if (!pastureFilters || catalogIds.length === 0) return new Set<string>()
    return pastureFilters
  }, [pastureFilters, catalogIds])

  const handlePastureChange = useCallback(
    (next: Set<string>) => {
      if (!setPastureFilters) return
      setPastureFilters(normalizePastureFiltersFromUi(next, catalogIds))
    },
    [setPastureFilters, catalogIds]
  )

  const dimensions = useMemo((): EntityFilterDimension[] => {
    const out: EntityFilterDimension[] = []
    if (showCalvingStatusSection) {
      out.push({
        kind: "multi",
        id: "calving",
        label: "Calving status",
        options: calvingMenuOptions,
        selectedIds: calvingFilters,
        allSelectedLabel: "All",
        placeholder: "All",
        "aria-label": "Calving status filters",
      })
    }
    out.push({
      kind: "multi",
      id: "health",
      label: "Health",
      options: healthMenuOptions,
      selectedIds: healthFilters,
      allSelectedLabel: "All",
      placeholder: "All",
      "aria-label": "Health filters",
    })
    if (pastureFilterOptions && pastureFilterOptions.length > 0 && setPastureFilters && pastureFilters !== undefined) {
      out.push({
        kind: "multi",
        id: "pasture",
        label: "Pasture",
        options: pastureMenuOptions,
        selectedIds: pastureUiSelectedIds,
        allSelectedLabel: "All pastures",
        placeholder: "All pastures",
        "aria-label": "Pasture filters",
      })
    }
    if (showBreedSection) {
      out.push({
        kind: "radio",
        id: "breed",
        label: "Breed",
        options: BREED_MENU_OPTIONS,
        value: breedFilter === "all" ? "all" : breedFilter,
        clearValueId: "all",
        placeholder: "All breeds",
        "aria-label": "Breed filter",
      })
    }
    return out
  }, [
    showCalvingStatusSection,
    calvingMenuOptions,
    calvingFilters,
    healthMenuOptions,
    healthFilters,
    pastureFilterOptions,
    setPastureFilters,
    pastureFilters,
    pastureMenuOptions,
    pastureUiSelectedIds,
    showBreedSection,
    breedFilter,
  ])

  const onMultiChange = useCallback(
    (id: string, next: Set<string>) => {
      if (id === "calving") setCalvingFilters(new Set([...next] as EffectiveCalvingStatus[]))
      else if (id === "health") setHealthFilters(new Set([...next] as ("Flag" | "Monitor" | "Good")[]))
      else if (id === "pasture") handlePastureChange(next)
    },
    [handlePastureChange, setCalvingFilters, setHealthFilters]
  )

  const onRadioChange = useCallback(
    (id: string, value: string) => {
      if (id === "breed") setBreedFilter(value === "all" ? "all" : (value as Breed))
    },
    [setBreedFilter]
  )

  return (
    <div className="flex flex-col gap-3">
      {showSearch ? (
        <SearchField
          size="sm"
          iconPosition="trailing"
          value={searchValue}
          onChange={onSearchChange}
          ariaLabel="Search pastures and cattle"
        />
      ) : null}

      <EntityFilterPanel dimensions={dimensions} onMultiChange={onMultiChange} onRadioChange={onRadioChange} />

      {showFooter && onReset && onApply ? (
        <div className={filterPanelFooterButtonRowClass}>
          <button type="button" className={filterPanelResetButtonClass} onClick={onReset}>
            Reset
          </button>
          <button type="button" className={filterPanelApplyButtonClass} onClick={onApply}>
            Apply
          </button>
        </div>
      ) : null}
    </div>
  )
}
