import { cn } from "@/lib/utils"

/**
 * Chrome for toolbar controls shown side-by-side (sort menu + filter).
 * Matches inactive EntityFilterToolbar: white surface, tertiary hairline border, 13px label.
 */
export const WORKSPACE_TOOLBAR_DROPDOWN_TRIGGER_CLASS = cn(
  "inline-flex h-9 min-h-9 shrink-0 cursor-pointer items-center gap-1.5 rounded-[var(--border-radius-md)] border-[0.5px] border-[var(--color-border-tertiary)] bg-white px-3 text-left text-[13px] font-normal text-[var(--color-text-primary)] shadow-[0_1px_2px_rgba(0,0,0,0.05)] outline-none transition-colors hover:bg-muted/40 focus-visible:ring-2 focus-visible:ring-ring/50 disabled:cursor-not-allowed disabled:opacity-50",
)
