import { cn } from "@/lib/utils"

/** Two-layer soft lift (homepage-only surfaces on RanchCalendarPage). */
export const homepageSoftShadowClass =
  "shadow-[0_2px_6px_rgba(0,0,0,0.04),_0_1px_2px_rgba(0,0,0,0.04)]"

/** White/neutral summary cards: border + shadow. */
export const homepageCardChromeClass = cn(
  "border-[0.5px] border-[rgba(0,0,0,0.06)] bg-card",
  homepageSoftShadowClass,
)

/** Weather pill: same edge + shadow; background stays secondary inline. */
export const homepageMutedSurfaceChromeClass = cn(
  "border-[0.5px] border-[rgba(0,0,0,0.06)]",
  homepageSoftShadowClass,
)

/** Category-token chips on white homepage cards (`--badge-category-*`; radius matches horse log rows). */
export const homepageCategoryBadgeClass = cn(
  "rounded-[var(--border-radius-md)] border px-2 py-0.5 text-[13px] font-medium whitespace-nowrap",
  "border-[var(--badge-category-border)] bg-[var(--badge-category-bg)] text-[var(--badge-category-text)]",
)
