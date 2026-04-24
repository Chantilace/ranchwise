import { useId } from "react"
import { cn } from "@/lib/utils"

/** Same chrome as Figma checkbox menu items, for single-select groups. */
export function FilterPanelRadioRow({
  checked,
  onSelect,
  children,
  className,
  name,
}: {
  checked: boolean
  onSelect: () => void
  children: React.ReactNode
  className?: string
  name: string
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
      <input id={id} type="radio" name={name} checked={checked} onChange={onSelect} className="peer sr-only" />
      <span
        aria-hidden
        className={cn(
          "flex size-3.5 shrink-0 items-center justify-center rounded-sm border border-[var(--border)] bg-white shadow-[0_1px_2px_rgba(0,0,0,0.05)] transition-colors",
          "peer-focus-visible:outline peer-focus-visible:outline-2 peer-focus-visible:outline-offset-2 peer-focus-visible:outline-ring/50",
          checked && "border-action"
        )}
      >
        {checked ? <span className="size-2 rounded-[2px] bg-action" /> : null}
      </span>
      <span className="min-w-0 flex-1 text-sm text-foreground">{children}</span>
    </label>
  )
}
