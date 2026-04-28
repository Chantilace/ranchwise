import { Search } from "lucide-react"

import { Input } from "@/components/ui/input"
import { cn } from "@/lib/utils"

export type SearchFieldProps = {
  value: string
  onChange: (value: string) => void
  placeholder?: string
  /** Accessible name for the text field (wrapper is not a labeled control). */
  ariaLabel: string
  /**
   * `sm` (h-8): compact toolbars, filter panels.
   * `md` (h-9): default for page toolbars and header search.
   */
  size?: "sm" | "md"
  /**
   * Leading is the default (common pattern). Trailing matches the former cattle filter panel layout.
   */
  iconPosition?: "leading" | "trailing"
  /**
   * `header`: width expands on focus (global shell).
   * `inline`: standard toolbar width rules; pair with `fullWidth` when the field should span its container.
   */
  variant?: "inline" | "header"
  fullWidth?: boolean
  className?: string
  disabled?: boolean
  autoComplete?: string
}

function innerInputClassName(fullWidth: boolean) {
  return cn(
    "min-h-0 max-w-full flex-1 border-0 bg-transparent p-0 text-sm text-foreground shadow-none placeholder:text-muted-foreground focus-visible:border-transparent focus-visible:ring-0",
    /** Shrink inside pill + flex toolbars; `!` beats any stray min-width from layers or merges. */
    fullWidth ? "basis-0 !min-w-0" : "min-w-0",
  )
}

/**
 * Pill search control: semantic border, no wrapper shadow, focus-within ring aligned with `Input` / `Textarea`
 * (`border-ring` + `ring-2 ring-action/25`). Icon is decorative; label comes from `ariaLabel` on the input.
 */
export function SearchField({
  value,
  onChange,
  placeholder = "Search",
  ariaLabel,
  size = "md",
  iconPosition = "leading",
  variant = "inline",
  fullWidth = false,
  className,
  disabled,
  autoComplete,
}: SearchFieldProps) {
  const icon = <Search className="size-4 shrink-0 text-muted-foreground" aria-hidden />

  const input = (
    <Input
      className={cn(innerInputClassName(fullWidth), size === "sm" ? "h-8" : "h-9")}
      placeholder={placeholder}
      value={value}
      onChange={(e) => onChange(e.target.value)}
      aria-label={ariaLabel}
      disabled={disabled}
      autoComplete={autoComplete}
    />
  )

  const innerRow = (
    <div className="flex min-h-0 min-w-0 w-full max-w-full flex-1 items-center gap-2">
      {iconPosition === "leading" ? (
        <>
          {icon}
          {input}
        </>
      ) : (
        <>
          {input}
          {icon}
        </>
      )}
    </div>
  )

  return (
    <div
      className={cn(
        "flex min-h-0 items-center rounded-full border border-border bg-white px-3 outline-none transition-[border-color,box-shadow] focus-within:border-ring focus-within:ring-2 focus-within:ring-inset focus-within:ring-action/25",
        size === "sm" ? "h-8" : "h-9",
        variant === "header" &&
          "w-36 shrink-0 transition-[width] duration-200 ease-out focus-within:w-64 sm:w-44 sm:focus-within:w-72",
        variant === "inline" &&
          (fullWidth
            ? "min-w-0 w-full max-w-full"
            : "w-full max-w-xs shrink-0 min-w-[12rem] sm:max-w-sm"),
        disabled && "pointer-events-none opacity-50",
        className
      )}
    >
      {innerRow}
    </div>
  )
}
