import { Search } from "lucide-react"
import { Input } from "@/components/ui/input"
import { cn } from "@/lib/utils"

/** Pill search with trailing icon — Figma Cattle Filters (62:7322). */
export function FilterPanelSearch({
  value,
  onChange,
  placeholder = "Search",
  ariaLabel,
  className,
}: {
  value: string
  onChange: (v: string) => void
  placeholder?: string
  ariaLabel: string
  className?: string
}) {
  return (
    <div
      className={cn(
        "flex h-8 w-full shrink-0 items-center gap-1.5 overflow-hidden rounded-full border border-border bg-white pl-4 pr-2 shadow-[0_1px_2px_rgba(0,0,0,0.05)]",
        className
      )}
    >
      <Input
        className="h-auto min-w-0 flex-1 border-0 bg-transparent p-0 text-sm text-foreground shadow-none placeholder:text-muted-foreground focus-visible:ring-0"
        placeholder={placeholder}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        aria-label={ariaLabel}
      />
      <Search className="size-4 shrink-0 text-muted-foreground" aria-hidden />
    </div>
  )
}
