import { Check } from "lucide-react"
import { useId } from "react"
import { cn } from "@/lib/utils"

/** Menu row + Figma-style 14px checkbox (rounded-sm, neutral border). */
export function FilterPanelCheckboxRow({
  checked,
  onCheckedChange,
  children,
  className,
}: {
  checked: boolean
  onCheckedChange: (next: boolean) => void
  children: React.ReactNode
  className?: string
}) {
  const id = useId()
  return (
    <label
      htmlFor={id}
      className={cn(
        "flex min-h-8 cursor-pointer items-center gap-2 rounded-md px-2 py-[5px] hover:bg-muted/40",
        className
      )}
    >
      <input
        id={id}
        type="checkbox"
        checked={checked}
        onChange={(e) => onCheckedChange(e.target.checked)}
        className="peer sr-only"
      />
      <span
        aria-hidden
        className={cn(
          "flex size-3.5 shrink-0 items-center justify-center rounded-sm border border-[var(--border)] bg-white shadow-[0_1px_2px_rgba(0,0,0,0.05)] transition-colors",
          "peer-focus-visible:outline peer-focus-visible:outline-2 peer-focus-visible:outline-offset-2 peer-focus-visible:outline-ring/50",
          checked && "border-action bg-action text-action-foreground"
        )}
      >
        {checked ? <Check className="size-2.5 stroke-[3]" /> : null}
      </span>
      <span className="min-w-0 flex-1 text-sm text-foreground">{children}</span>
    </label>
  )
}
