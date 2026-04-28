import { useCallback, useState } from "react"
import { MenuMultiSelectField, MenuRadioSelectField } from "@/components/ui/menu-multi-select-field"
import type { MenuRoot } from "@base-ui/react/menu"

export type EntityFilterMultiDimension = {
  kind: "multi"
  id: string
  label: string
  options: readonly { id: string; label: string }[]
  selectedIds: ReadonlySet<string>
  allSelectedLabel?: string
  placeholder?: string
  "aria-label"?: string
}

export type EntityFilterRadioDimension = {
  kind: "radio"
  id: string
  label: string
  options: readonly { id: string; label: string }[]
  value: string
  clearValueId?: string
  placeholder?: string
  "aria-label"?: string
}

export type EntityFilterDimension = EntityFilterMultiDimension | EntityFilterRadioDimension

export type EntityFilterPanelProps = {
  dimensions: readonly EntityFilterDimension[]
  onMultiChange: (id: string, next: Set<string>) => void
  onRadioChange: (id: string, value: string) => void
}

function multiSectionLabel(label: string, selectedCount: number): string {
  const suffix = selectedCount > 0 ? ` (${selectedCount})` : ""
  return `${label}${suffix}`
}

/**
 * Generic checkbox / radio filter fields (compact), one menu open at a time.
 * Pairs with `EntityFilterToolbar` on roster pages.
 */
export function EntityFilterPanel({ dimensions, onMultiChange, onRadioChange }: EntityFilterPanelProps) {
  const [openMenuId, setOpenMenuId] = useState<string | null>(null)

  const bindExclusive = useCallback(
    (id: string) => ({
      open: openMenuId === id,
      onOpenChange: (open: boolean, _details: MenuRoot.ChangeEventDetails) => {
        if (open) setOpenMenuId(id)
        else setOpenMenuId((m) => (m === id ? null : m))
      },
    }),
    [openMenuId]
  )

  return (
    <div className="flex flex-col gap-3">
      {dimensions.map((dim) => {
        const exclusive = bindExclusive(dim.id)
        if (dim.kind === "multi") {
          const count = dim.selectedIds.size
          return (
            <MenuMultiSelectField
              key={dim.id}
              sectionLabel={multiSectionLabel(dim.label, count)}
              options={dim.options}
              selectedIds={dim.selectedIds}
              onChange={(next) => onMultiChange(dim.id, next)}
              allSelectedLabel={dim.allSelectedLabel}
              placeholder={dim.placeholder ?? "All"}
              density="compact"
              aria-label={dim["aria-label"] ?? `${dim.label} filters`}
              open={exclusive.open}
              onOpenChange={exclusive.onOpenChange}
            />
          )
        }
        return (
          <MenuRadioSelectField
            key={dim.id}
            sectionLabel={dim.label}
            options={dim.options}
            value={dim.value}
            onChange={(v) => onRadioChange(dim.id, v)}
            placeholder={dim.placeholder}
            clearValueId={dim.clearValueId}
            aria-label={dim["aria-label"] ?? `${dim.label} filter`}
            open={exclusive.open}
            onOpenChange={exclusive.onOpenChange}
          />
        )
      })}
    </div>
  )
}
