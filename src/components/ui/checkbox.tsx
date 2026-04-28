import { useEffect, useId, useRef } from "react"
import type { ReactNode } from "react"

import { CheckboxBox, type CheckboxBoxChecked } from "@/components/ui/checkbox-box"
import { cn } from "@/lib/utils"

export type CheckboxProps = {
  checked: CheckboxBoxChecked
  onChange: (checked: boolean) => void
  label?: ReactNode
  count?: number
  disabled?: boolean
  size?: "sm" | "md"
  className?: string
}

/**
 * List-panel checkbox row: native input (sr-only) + hover row + focus ring on the painted box.
 * Use for filter panels and checklist popovers. Menus keep Base UI `CheckboxItem` semantics.
 */
export function Checkbox({
  checked,
  onChange,
  label,
  count,
  disabled = false,
  size = "md",
  className,
}: CheckboxProps) {
  const id = useId()
  const inputRef = useRef<HTMLInputElement | null>(null)

  useEffect(() => {
    if (!inputRef.current) return
    inputRef.current.indeterminate = checked === "mixed"
  }, [checked])

  const handleToggle = () => {
    if (disabled) return
    if (checked === "mixed") {
      onChange(true)
      return
    }
    onChange(!checked)
  }

  return (
    <label
      htmlFor={id}
      className={cn(
        "flex min-h-8 cursor-pointer items-center gap-2 rounded-md px-2 py-[5px] hover:bg-muted/40",
        disabled && "cursor-not-allowed opacity-50",
        className
      )}
      onClick={(e) => {
        // Ensure clicking anywhere on the row toggles (not just the sr-only input).
        // Prevent double-toggle from label + input click.
        e.preventDefault()
        handleToggle()
      }}
    >
      <input
        ref={inputRef}
        id={id}
        type="checkbox"
        checked={checked === true}
        onChange={(e) => onChange(e.target.checked)}
        disabled={disabled}
        className="peer sr-only"
      />
      <CheckboxBox
        checked={checked}
        size={size}
        className="peer-focus-visible:outline peer-focus-visible:outline-2 peer-focus-visible:outline-offset-2 peer-focus-visible:outline-ring/50"
      />
      {label != null ? (
        <span className="min-w-0 flex-1 text-sm text-foreground">{label}</span>
      ) : (
        <span className="min-w-0 flex-1" />
      )}
      {typeof count === "number" ? (
        <span className="shrink-0 text-[13px] text-muted-foreground">({count})</span>
      ) : null}
    </label>
  )
}

