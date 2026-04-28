import { ChevronDown, type LucideIcon } from "lucide-react"
import type { ButtonHTMLAttributes, ReactNode } from "react"
import { WORKSPACE_TOOLBAR_DROPDOWN_TRIGGER_CLASS } from "@/lib/workspaceToolbarDropdownTrigger"
import { cn } from "@/lib/utils"

const iconClass = "size-3 shrink-0 text-muted-foreground"

export type WorkspaceToolbarMenuTriggerProps = Omit<ButtonHTMLAttributes<HTMLButtonElement>, "children"> & {
  /** Leading icon (e.g. ListFilter, ArrowDownWideNarrow). Omit for label + chevron only. */
  icon?: LucideIcon
  children: ReactNode
}

/**
 * Shared disclosure trigger for workspace toolbars (sort menus, custom popovers).
 * Pairs visually with {@link EntityFilterToolbar} inactive state.
 */
export function WorkspaceToolbarMenuTrigger({
  icon: Icon,
  children,
  className,
  type = "button",
  ...props
}: WorkspaceToolbarMenuTriggerProps) {
  return (
    <button type={type} className={cn(WORKSPACE_TOOLBAR_DROPDOWN_TRIGGER_CLASS, className)} {...props}>
      {Icon ? <Icon className={iconClass} strokeWidth={2} aria-hidden /> : null}
      <span className="min-w-0 flex-1 truncate text-left">{children}</span>
      <ChevronDown className={cn(iconClass)} strokeWidth={2} aria-hidden />
    </button>
  )
}
