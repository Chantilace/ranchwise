import { ChevronDown } from "lucide-react"
import type { ReactNode } from "react"

/** Bordered block with select-style header row — Figma “Select & Combobox” rows. */
export function FilterSelectSection({ title, children }: { title: string; children: ReactNode }) {
  return (
    <div className="overflow-hidden rounded-lg border border-border bg-white shadow-[0_1px_2px_rgba(0,0,0,0.05)]">
      <div className="flex min-h-9 items-center gap-2 border-b border-border bg-white px-3 py-2 pr-2">
        <span className="min-w-0 flex-1 text-sm text-muted-foreground">{title}</span>
        <ChevronDown className="size-4 shrink-0 text-muted-foreground" aria-hidden />
      </div>
      <div className="flex flex-col gap-0.5 p-2">{children}</div>
    </div>
  )
}
