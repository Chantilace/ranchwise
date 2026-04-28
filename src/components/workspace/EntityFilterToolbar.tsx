import { ChevronDown, ListFilter, X } from "lucide-react"
import { cn } from "@/lib/utils"

export type EntityFilterToolbarProps = {
  open: boolean
  onToggleOpen: () => void
  activeCategoryCount: number
  onClearAll: () => void
  /** e.g. "Filter cattle roster" */
  filterButtonAriaLabel: string
}

/**
 * Roster filter control: **Filters** when none active, **Filters (n)** + × clear when filters apply.
 * Parent should use `relative shrink-0` and the same ref as the dropdown panel for outside-click.
 */
export function EntityFilterToolbar({
  open,
  onToggleOpen,
  activeCategoryCount,
  onClearAll,
  filterButtonAriaLabel,
}: EntityFilterToolbarProps) {
  return (
    <div
      className={cn(
        "inline-flex h-9 min-h-9 shrink-0 overflow-hidden rounded-[var(--border-radius-md)] border-[0.5px] shadow-[0_1px_2px_rgba(0,0,0,0.05)] outline-none focus-within:ring-2 focus-within:ring-ring/50",
        activeCategoryCount > 0
          ? "border-action bg-ai-accent-wash text-action"
          : "border-[var(--color-border-tertiary)] bg-white text-[var(--color-text-primary)]"
      )}
    >
      <button
        type="button"
        className="inline-flex h-9 min-h-9 items-center gap-1.5 border-0 bg-transparent px-3 text-[13px] outline-none transition-colors hover:bg-muted/40 focus-visible:z-10"
        aria-expanded={open}
        aria-haspopup="true"
        aria-label={filterButtonAriaLabel}
        onClick={onToggleOpen}
      >
        <ListFilter
          className={cn(
            "size-3 shrink-0",
            activeCategoryCount > 0 ? "text-action" : "text-muted-foreground"
          )}
          strokeWidth={2}
          aria-hidden
        />
        <span className="tabular-nums">
          Filters{activeCategoryCount === 0 ? "" : ` (${activeCategoryCount})`}
        </span>
        {activeCategoryCount === 0 ? (
          <ChevronDown className="size-3 shrink-0 text-muted-foreground" strokeWidth={2} aria-hidden />
        ) : null}
      </button>
      {activeCategoryCount > 0 ? (
        <button
          type="button"
          aria-label="Clear all filters"
          className="flex h-9 min-h-9 items-center border-l border-action/25 bg-transparent px-2.5 outline-none transition-colors hover:bg-action/5 focus-visible:z-10 focus-visible:ring-2 focus-visible:ring-ring/40"
          onClick={(e) => {
            e.stopPropagation()
            onClearAll()
          }}
          onPointerDown={(e) => e.stopPropagation()}
        >
          <X className="size-4 shrink-0" aria-hidden />
        </button>
      ) : null}
    </div>
  )
}
