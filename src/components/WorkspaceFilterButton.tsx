import { ListFilter, type LucideIcon } from "lucide-react"
import type { ButtonHTMLAttributes, ReactNode } from "react"
import { WorkspaceToolbarMenuTrigger } from "@/components/workspace/WorkspaceToolbarMenuTrigger"

export type WorkspaceMenuTriggerProps = Omit<ButtonHTMLAttributes<HTMLButtonElement>, "children"> & {
  icon?: LucideIcon
  children: ReactNode
}

/** Shared toolbar control — icon + label + chevron (filter, sort, etc.). */
export function WorkspaceMenuTrigger({
  icon: Icon = ListFilter,
  children,
  className,
  type = "button",
  ...props
}: WorkspaceMenuTriggerProps) {
  return (
    <WorkspaceToolbarMenuTrigger type={type} icon={Icon} className={className} {...props}>
      {children}
    </WorkspaceToolbarMenuTrigger>
  )
}

export type WorkspaceFilterButtonProps = Omit<WorkspaceMenuTriggerProps, "children" | "icon">

/**
 * Filter control — rounded rectangle, border, funnel + label + chevron (cattle / horses toolbars).
 */
export function WorkspaceFilterButton({ className, type = "button", ...props }: WorkspaceFilterButtonProps) {
  return (
    <WorkspaceMenuTrigger type={type} className={className} icon={ListFilter} {...props}>
      Filter
    </WorkspaceMenuTrigger>
  )
}
