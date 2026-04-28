import { Check } from "lucide-react"

import { cn } from "@/lib/utils"

export type CheckboxBoxChecked = boolean | "mixed"

export type CheckboxBoxProps = {
  /** `true` = checked, `false` = empty, `"mixed"` = indeterminate */
  checked: CheckboxBoxChecked
  /** Canonical default is `md` (4px). `sm` exists for dense UI but uses the same radius family. */
  size?: "sm" | "md"
  disabled?: boolean
  className?: string
}

/**
 * Visual-only checkbox square used across list panels and menus.
 * Interaction, focus management, and keyboard support are the wrapper's responsibility.
 */
export function CheckboxBox({ checked, size = "md", disabled = false, className }: CheckboxBoxProps) {
  const isMixed = checked === "mixed"
  const isChecked = checked === true
  const active = isChecked || isMixed

  return (
    <span
      aria-hidden
      className={cn(
        "flex shrink-0 items-center justify-center rounded border transition-colors",
        size === "sm" ? "size-3.5" : "size-4",
        active ? "border-action bg-action" : "border-border bg-white",
        disabled && "opacity-50",
        className
      )}
    >
      {isChecked ? <Check className={cn(size === "sm" ? "size-3" : "size-3.5", "text-white")} strokeWidth={2.5} /> : null}
      {isMixed ? (
        <svg
          viewBox="0 0 9 2"
          className={cn(size === "sm" ? "h-0.5 w-2" : "h-0.5 w-[9px]")}
          aria-hidden
        >
          <line x1="0" y1="1" x2="9" y2="1" stroke="white" strokeWidth="2" />
        </svg>
      ) : null}
    </span>
  )
}

