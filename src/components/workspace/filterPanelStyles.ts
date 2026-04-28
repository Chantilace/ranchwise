import { buttonVariants } from "@/components/ui/button"
import { appDropdownPanelClass } from "@/lib/appDropdownTokens"
import { cn } from "@/lib/utils"

/** Shared shell for Figma-aligned filter / sort popovers (same surface as action menus). */
export const workspaceFilterPanelClass = cn(
  "absolute left-0 z-30 mt-1 w-[min(calc(100vw-1rem),360px)] p-3",
  appDropdownPanelClass
)

export const filterPanelTitleClass = "text-[13px] leading-4 text-foreground"

export const filterPanelFooterButtonRowClass = "flex w-full justify-end gap-2"

export const filterPanelApplyButtonClass = cn(
  buttonVariants({ variant: "primary", size: "sm" }),
  "h-8 min-h-8 min-w-0 px-3"
)

export const filterPanelResetButtonClass = cn(
  buttonVariants({ variant: "secondary", size: "sm" }),
  "h-8 min-h-8 min-w-0 px-3 shadow-[0_1px_2px_rgba(0,0,0,0.05)]"
)
