import type { MouseEvent } from "react"
import { Plus } from "lucide-react"
import { cn } from "@/lib/utils"

/** Same width on horse + cattle rosters so `table-layout: auto` does not stretch the last column on cattle only. */
export const ROSTER_OBSERVATION_COLUMN_PX = 112
export const rosterObservationColumnWidthClass = "w-[112px] min-w-[112px] max-w-[112px]"

export type ObservationTableActionsCellProps = {
  onAddClick: (e: MouseEvent<HTMLButtonElement>) => void
  className?: string
}

/**
 * Observation column: icon-only + (opens log flow). Text “Log observation” CTAs live elsewhere.
 */
export function ObservationTableActionsCell({
  onAddClick,
  className,
}: ObservationTableActionsCellProps) {
  return (
    <div
      className={cn(
        "flex h-full min-h-16 w-full min-w-0 items-center justify-center bg-inherit p-0 opacity-100",
        className,
      )}
      onClick={(e) => e.stopPropagation()}
      onKeyDown={(e) => e.stopPropagation()}
      role="presentation"
    >
      <button
        type="button"
        title="Log observation"
        aria-label="Log observation"
        className={cn(
          "flex h-[28px] w-[28px] shrink-0 cursor-pointer items-center justify-center rounded-full border-none bg-action-tint text-action outline-none transition-colors hover:bg-action-tint-strong focus-visible:ring-2 focus-visible:ring-ring/35 disabled:pointer-events-none disabled:opacity-50",
        )}
        onClick={onAddClick}
      >
        <Plus className="h-[13px] w-[13px]" strokeWidth={2} aria-hidden />
      </button>
    </div>
  )
}
