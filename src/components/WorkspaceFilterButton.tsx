import { ChevronDown, ListFilter, type LucideIcon } from "lucide-react"
import type { ButtonHTMLAttributes, ReactNode } from "react"
import { cn } from "@/lib/utils"

const menuTriggerClass =
  "flex h-9 shrink-0 items-center gap-2 rounded-lg border border-neutral-200 bg-white pl-3 pr-2 text-sm text-foreground shadow-[0_1px_2px_rgba(0,0,0,0.05)] outline-none hover:bg-neutral-50/80 focus-visible:ring-2 focus-visible:ring-ring/50"

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
    <button type={type} className={cn(menuTriggerClass, className)} {...props}>
      <Icon className="size-4 shrink-0 text-neutral-600" aria-hidden />
      {children}
      <ChevronDown className="size-4 shrink-0 text-neutral-600" aria-hidden />
    </button>
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
