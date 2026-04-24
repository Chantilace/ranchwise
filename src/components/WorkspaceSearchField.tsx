import { Search } from "lucide-react"
import { Input } from "@/components/ui/input"
import { cn } from "@/lib/utils"

export type WorkspaceSearchFieldProps = {
  value: string
  onChange: (value: string) => void
  placeholder?: string
  ariaLabel: string
  /** Header: grows on focus. Inline toolbars: fixed width. */
  variant?: "header" | "inline"
  className?: string
}

/**
 * Shared pill search — white field, light border, magnifier, matches global RanchWise header.
 */
export function WorkspaceSearchField({
  value,
  onChange,
  placeholder = "Search",
  ariaLabel,
  variant = "inline",
  className,
}: WorkspaceSearchFieldProps) {
  return (
    <div
      className={cn(
        "flex shrink-0 items-center gap-2 rounded-full border border-neutral-200 bg-white px-3 shadow-[0_1px_2px_rgba(0,0,0,0.05)]",
        variant === "header" ? "h-8" : "h-9",
        variant === "header" &&
          "w-36 transition-[width] duration-200 ease-out focus-within:w-64 sm:w-44 sm:focus-within:w-72",
        variant === "inline" && "min-w-[12rem] w-full max-w-xs sm:max-w-sm",
        className
      )}
    >
      <Search className="size-4 shrink-0 text-neutral-500" aria-hidden />
      <Input
        className="h-auto min-w-0 flex-1 border-0 bg-transparent p-0 text-sm text-foreground shadow-none placeholder:text-neutral-500 focus-visible:ring-0"
        placeholder={placeholder}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        aria-label={ariaLabel}
      />
    </div>
  )
}
