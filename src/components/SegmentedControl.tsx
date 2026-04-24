import type { ReactNode } from "react"
import { cn } from "@/lib/utils"

export type SegmentedControlItem<T extends string> = {
  id: T
  label: ReactNode
}

type SegmentedControlProps<T extends string> = {
  items: SegmentedControlItem<T>[]
  value: T
  onChange: (id: T) => void
  ariaLabel: string
  className?: string
}

/**
 * Figma Ranch Co-Pilot — pill group on muted track, active segment white + shadow-sm (e.g. Cattle 62:3628).
 */
export function SegmentedControl<T extends string>({
  items,
  value,
  onChange,
  ariaLabel,
  className,
}: SegmentedControlProps<T>) {
  return (
    <div
      role="radiogroup"
      aria-label={ariaLabel}
      className={cn("inline-flex shrink-0 items-center rounded-[10px] bg-muted p-[3px]", className)}
    >
      {items.map((item) => {
        const active = value === item.id
        return (
          <button
            key={item.id}
            type="button"
            role="radio"
            aria-checked={active}
            onClick={() => onChange(item.id)}
            className={cn(
              "flex min-h-[29px] min-w-[29px] items-center justify-center rounded-[10px] px-2 py-1 text-sm font-medium transition-shadow",
              active
                ? "bg-background text-foreground shadow-sm"
                : "text-foreground hover:opacity-90"
            )}
          >
            {item.label}
          </button>
        )
      })}
    </div>
  )
}
