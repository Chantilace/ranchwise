import { cn } from "@/lib/utils"

export type FilteredCountDisplayProps = {
  filteredCount: number
  totalCount: number
  /** Lowercase noun after the numbers, e.g. `cattle`, `horses`, `observations`. */
  entityName: string
  /** When false, nothing is rendered (caller derives from filter/search state). */
  visible: boolean
  /** Optional inline clear action (e.g. roster empty state affordance). */
  onClearFilters?: () => void
  className?: string
}

/**
 * “Showing X of Y {entity}” with the filtered count visually emphasized.
 * Use `visible` only when filters (and/or roster search) are active, per cattle roster semantics.
 */
export function FilteredCountDisplay({
  filteredCount,
  totalCount,
  entityName,
  visible,
  onClearFilters,
  className,
}: FilteredCountDisplayProps) {
  if (!visible) return null

  return (
    <p className={cn("text-[13px] text-[var(--color-text-secondary)]", className)}>
      Showing{" "}
      <span className="font-semibold tabular-nums text-foreground">{filteredCount}</span>
      {" "}
      of <span className="tabular-nums">{totalCount}</span> {entityName}
      {onClearFilters ? (
        <>
          {" · "}
          <button
            type="button"
            className="border-0 bg-transparent p-0 text-action underline-offset-2 hover:underline"
            onClick={onClearFilters}
          >
            Clear filters
          </button>
        </>
      ) : null}
    </p>
  )
}
