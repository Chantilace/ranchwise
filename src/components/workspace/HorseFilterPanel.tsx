import type { Dispatch, SetStateAction } from "react"
import { useMemo, useState } from "react"
import { Separator } from "@/components/ui/separator"
import { horseStatusFilterSwatchById } from "@/lib/filterOptionSwatches"
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

const STATUS_OPTIONS: { id: "flag" | "monitor" | "good"; label: string }[] = [
  { id: "flag", label: "Flag" },
  { id: "monitor", label: "Monitor" },
  { id: "good", label: "Good" },
]

const SEX_IDS = ["Mare", "Gelding", "Stallion"] as const

export type HorseFilterPanelProps = {
  statusFilters: Set<"flag" | "monitor" | "good">
  setStatusFilters: Dispatch<SetStateAction<Set<"flag" | "monitor" | "good">>>
  behaviorStatusFilters: Set<"flag" | "monitor" | "good">
  setBehaviorStatusFilters: Dispatch<SetStateAction<Set<"flag" | "monitor" | "good">>>
  pastureFilters: Set<string>
  setPastureFilters: Dispatch<SetStateAction<Set<string>>>
  sexFilters: Set<string>
  setSexFilters: Dispatch<SetStateAction<Set<string>>>
  /** Sorted pasture labels from herd + catalog. */
  pastureNames: readonly string[]
  onReset: () => void
  onApply: () => void
}

export function HorseFilterPanel({
  statusFilters,
  setStatusFilters,
  behaviorStatusFilters,
  setBehaviorStatusFilters,
  pastureFilters,
  setPastureFilters,
  sexFilters,
  setSexFilters,
  pastureNames,
  onReset,
  onApply,
}: HorseFilterPanelProps) {
  const [expandedId, setExpandedId] = useState<string | null>(null)
  const toggleCategory = (id: string) => setExpandedId((cur) => (cur === id ? null : id))

  const statusOptions: RanchFilterOption[] = useMemo(
    () =>
      STATUS_OPTIONS.map((o) => ({
        id: o.id,
        label: o.label,
        swatchClassName: horseStatusFilterSwatchById[o.id],
      })),
    []
  )

  const pastureOptions: RanchFilterOption[] = useMemo(
    () => pastureNames.map((n) => ({ id: n, label: n })),
    [pastureNames]
  )

  const sexOptions: RanchFilterOption[] = useMemo(
    () => SEX_IDS.map((id) => ({ id, label: id })),
    []
  )

  const statusSelectedIds = useMemo(() => new Set<string>(statusFilters), [statusFilters])
  const behaviorStatusSelectedIds = useMemo(
    () => new Set<string>(behaviorStatusFilters),
    [behaviorStatusFilters]
  )

  return (
    <div className="flex flex-col gap-3">
      <p className={filterPanelTitleClass}>Filters</p>

      <RanchFilterCategoryField
        sectionLabel="Health status"
        options={statusOptions}
        selectedIds={statusSelectedIds}
        onChange={(next) => setStatusFilters(new Set([...next] as ("flag" | "monitor" | "good")[]))}
        expanded={expandedId === "status"}
        onToggleExpand={() => toggleCategory("status")}
        aria-label="Horse health status filters"
      />

      <RanchFilterCategoryField
        sectionLabel="Behavior status"
        options={statusOptions}
        selectedIds={behaviorStatusSelectedIds}
        onChange={(next) =>
          setBehaviorStatusFilters(new Set([...next] as ("flag" | "monitor" | "good")[]))
        }
        expanded={expandedId === "behavior"}
        onToggleExpand={() => toggleCategory("behavior")}
        aria-label="Horse behavior status filters"
      />

      <RanchFilterCategoryField
        sectionLabel="Pasture"
        options={pastureOptions}
        selectedIds={pastureFilters}
        onChange={setPastureFilters}
        expanded={expandedId === "pasture"}
        onToggleExpand={() => toggleCategory("pasture")}
        aria-label="Pasture filters"
      />

      <RanchFilterCategoryField
        sectionLabel="Sex"
        options={sexOptions}
        selectedIds={sexFilters}
        onChange={setSexFilters}
        expanded={expandedId === "sex"}
        onToggleExpand={() => toggleCategory("sex")}
        aria-label="Sex filters"
      />

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
