import { buttonVariants } from "@/components/ui/button"
import { cn } from "@/lib/utils"

/**
 * Shared floating surfaces and menu rows — aligned with Figma observation overflow
 * (white card, generous radius, soft shadow, foreground labels, red destructive).
 */

export const appDropdownPanelClass =
  "rounded-xl border border-neutral-200/90 bg-white shadow-[0_4px_24px_-6px_rgba(0,0,0,0.1),0_2px_10px_-4px_rgba(0,0,0,0.08)]"

export const appMenuPopupClass = cn(appDropdownPanelClass, "min-w-[160px] py-1.5 text-sm outline-none")

export const appMenuItemClass =
  "flex w-full cursor-pointer items-center px-3 py-2.5 text-left text-sm font-normal text-[var(--foreground)] outline-none data-[highlighted]:bg-neutral-100"

export const appMenuItemDestructiveClass =
  "flex w-full cursor-pointer items-center px-3 py-2.5 text-left text-sm font-normal text-red-600 outline-none data-[highlighted]:bg-red-50"

/** Circular overflow trigger — tier 2 icon (primary tint). */
export const appMenuOverflowTriggerClass = cn(
  buttonVariants({ variant: "icon", size: "iconSecondary" }),
  "disabled:opacity-40"
)

export const appListboxPanelClass = cn(appDropdownPanelClass, "py-1 outline-none")

export const appListboxOptionClass =
  "flex w-full items-center gap-2 px-3 py-2.5 text-left text-sm text-[var(--foreground)] outline-none hover:bg-neutral-100 focus-visible:bg-neutral-100"

/** Border / shadow / focus ring shared by native selects and composite triggers (e.g. feed picker). */
export const appNativeSelectSurfaceClass =
  "rounded-xl border border-neutral-200/90 bg-white shadow-[0_1px_2px_rgba(0,0,0,0.04)] outline-none focus-visible:border-action focus-visible:ring-2 focus-visible:ring-action/25"

/** Full-width Menu trigger — matches former native `<select>` fields (Log / Add animal / Edit profile). */
export const appMenuSelectTriggerClass = cn(
  "flex h-10 w-full min-w-0 cursor-pointer items-center justify-between gap-2 px-3 text-left text-sm font-normal text-[var(--foreground)] disabled:cursor-not-allowed disabled:opacity-50",
  appNativeSelectSurfaceClass
)

export const appMenuSelectTriggerCompactClass = cn(
  "flex h-8 min-h-8 w-full min-w-0 cursor-pointer items-center justify-between gap-2 px-2 py-1 text-left text-xs font-normal text-[var(--foreground)] disabled:opacity-50",
  appNativeSelectSurfaceClass
)

export const appNativeSelectFieldClass = cn(
  "h-10 w-full cursor-pointer px-3 text-sm text-[var(--foreground)] disabled:opacity-50",
  appNativeSelectSurfaceClass
)

export const appNativeSelectFieldCompactClass = cn(
  "h-8 w-[128px] cursor-pointer appearance-none py-1 pr-8 pl-2 text-xs text-[var(--foreground)]",
  appNativeSelectSurfaceClass
)

/** Compact pill selects (e.g. observation filters on profile). */
export const appNativeSelectPillClass =
  "cursor-pointer rounded-full border border-neutral-200/90 bg-white px-3 py-1.5 text-xs text-[var(--foreground)] shadow-[0_1px_2px_rgba(0,0,0,0.04)] outline-none focus-visible:border-action focus-visible:ring-2 focus-visible:ring-action/25"
