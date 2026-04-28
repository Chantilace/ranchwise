import { ArrowDownWideNarrow } from "lucide-react"
import { AppMenuSelect } from "@/components/ui/app-menu-select"
import { ROSTER_LAST_ACTIVITY_SORT_OPTIONS } from "@/lib/rosterLastActivitySort"

type RosterLastActivitySortSelectProps = {
  /** Menu selection when sort is by last observation; use `"custom"` when a column sort is active. */
  value: "desc" | "asc" | "custom"
  onValueChange: (next: "desc" | "asc") => void
  /** Shown on the trigger when `value` is `"custom"` (or whenever you want to override the option label). */
  triggerLabel?: string
  "aria-label"?: string
  className?: string
}

/** Same toolbar pill + chevron pattern as the horse profile observation log sort. */
export function RosterLastActivitySortSelect({
  value,
  onValueChange,
  triggerLabel,
  "aria-label": ariaLabel = "Sort by last activity",
  className,
}: RosterLastActivitySortSelectProps) {
  return (
    <AppMenuSelect
      variant="toolbar"
      leadingIcon={ArrowDownWideNarrow}
      className={className ?? "min-w-[132px] shrink-0"}
      value={value === "custom" ? "" : value}
      triggerLabel={value === "custom" ? triggerLabel : undefined}
      onValueChange={(v) => onValueChange(v as "desc" | "asc")}
      options={ROSTER_LAST_ACTIVITY_SORT_OPTIONS}
      aria-label={ariaLabel}
    />
  )
}
