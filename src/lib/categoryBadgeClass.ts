import { cn } from "@/lib/utils"

/**
 * Category pill on observation / pasture check metadata rows.
 * Uses compact geometry (10px) aligned with `StatusBadge` size `sm`, not table roster pills.
 */
export const CATEGORY_METADATA_BADGE_CLASS =
  "inline-flex items-center rounded-md border-[0.5px] border-badge-category-border bg-badge-category-bg px-[6px] py-px text-[13px] font-medium text-badge-category-text [&_svg]:text-badge-category-text"

/**
 * Roster page title headcount (e.g. "258 cattle") — same warm tokens as observation category pills (`ObservationCategoryBadge`).
 */
export const ROSTER_HEADCOUNT_BADGE_CLASS = cn(
  "inline-flex shrink-0 items-center rounded-md border-[0.5px] border-badge-category-border bg-badge-category-bg text-[13px] font-medium tabular-nums text-badge-category-text",
  "px-2.5 py-0.5",
)
