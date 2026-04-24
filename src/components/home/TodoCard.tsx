import { ArrowUpRight, type LucideIcon } from "lucide-react"

import type { TodoChipVariant } from "@/lib/todoDerivation"
import { cn } from "@/lib/utils"

const chipClass: Record<TodoChipVariant, { wrap: string; icon: string }> = {
  flag: {
    wrap: "bg-status-flag-bg",
    icon: "text-status-flag-text",
  },
  pasture: {
    wrap: "bg-[var(--alert-pasture-bg)]",
    icon: "text-[var(--pasture-text)]",
  },
  amber: {
    wrap: "bg-[var(--alert-amber-bg)]",
    icon: "text-[var(--alert-amber-text)]",
  },
  neutral: {
    wrap: "bg-[var(--alert-neutral-bg)]",
    icon: "text-[var(--alert-neutral-text)]",
  },
}

export function TodoCard({
  icon: Icon,
  title,
  count,
  chipVariant,
  layout = "grid",
  onClick,
}: {
  icon: LucideIcon
  title: string
  count: number
  chipVariant: TodoChipVariant
  layout?: "grid" | "drawer"
  onClick: () => void
}) {
  const chip = chipClass[chipVariant]

  if (layout === "drawer") {
    return (
      <button
        type="button"
        onClick={onClick}
        className={cn(
          "shadow-card group flex w-full cursor-pointer flex-col gap-[14px] rounded-xl border-[0.5px] border-border bg-card py-4 pl-[18px] pr-[18px] text-left subpixel-antialiased backface-hidden transition-[transform,box-shadow,border-color,background-color] duration-[250ms] ease-[cubic-bezier(0.25,0.1,0.25,1.0)] hover:scale-[1.025] hover:-translate-y-[2px] hover:border-border-strong hover:bg-muted/30 hover:shadow-card-strong focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring/40"
        )}
      >
        <div className="flex items-start justify-between">
          <div
            className={cn(
              "flex h-[34px] w-[34px] shrink-0 items-center justify-center rounded-lg",
              chip.wrap
            )}
          >
            <Icon className={cn("h-4 w-4", chip.icon)} strokeWidth={1.7} aria-hidden />
          </div>
          <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-[7px] bg-muted transition-colors duration-[120ms] group-hover:bg-muted-deeper">
            <ArrowUpRight className="h-[13px] w-[13px] text-foreground" strokeWidth={2} aria-hidden />
          </div>
        </div>
        <div>
          <p className="mb-1 text-[13px] font-medium text-muted-foreground">{title}</p>
          <p className="text-[28px] font-medium tracking-[-0.02em] text-foreground">{count}</p>
        </div>
      </button>
    )
  }

  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        "shadow-card group flex w-full min-w-0 cursor-pointer rounded-xl border-[0.5px] border-border bg-card text-left subpixel-antialiased backface-hidden transition-[transform,box-shadow,border-color,background-color] duration-[250ms] ease-[cubic-bezier(0.25,0.1,0.25,1.0)] hover:scale-[1.025] hover:-translate-y-[2px] hover:border-border-strong hover:bg-muted/30 hover:shadow-card-strong focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring/40",
        "flex-row items-center gap-3 p-3 md:h-full md:flex-col md:items-stretch md:gap-[10px] md:p-[12px_14px]",
        "md:min-w-0 md:basis-0 md:flex-1 md:max-w-none",
        "min-[1100px]:w-60 min-[1100px]:min-w-60 min-[1100px]:max-w-60 min-[1100px]:flex-none min-[1100px]:grow-0 min-[1100px]:shrink-0",
        "min-[1100px]:gap-[14px] min-[1100px]:p-[16px_18px]",
      )}
    >
      <div className="flex shrink-0 items-center md:w-full md:justify-between">
        <div
          className={cn(
            "flex shrink-0 items-center justify-center rounded-lg",
            "h-7 w-7 min-[1100px]:h-[34px] min-[1100px]:w-[34px]",
            chip.wrap
          )}
        >
          <Icon
            className={cn("size-[13px] min-[1100px]:h-4 min-[1100px]:w-4", chip.icon)}
            strokeWidth={1.7}
            aria-hidden
          />
        </div>
        <div className="hidden h-[22px] w-[22px] shrink-0 items-center justify-center rounded-[6px] bg-muted transition-colors duration-[120ms] group-hover:bg-muted-deeper md:flex min-[1100px]:h-7 min-[1100px]:w-7 min-[1100px]:rounded-[7px]">
          <ArrowUpRight
            className="h-[11px] w-[11px] text-foreground min-[1100px]:h-[13px] min-[1100px]:w-[13px]"
            strokeWidth={2}
            aria-hidden
          />
        </div>
      </div>
      <div className="min-w-0 flex-1 md:w-full">
        <p className="mb-0.5 text-xs font-medium text-muted-foreground md:mb-1 md:truncate min-[1100px]:overflow-visible min-[1100px]:whitespace-normal min-[1100px]:text-sm">
          {title}
        </p>
        <p className="text-[22px] font-medium tracking-[-0.02em] text-foreground min-[1100px]:text-[28px]">{count}</p>
      </div>
      <div className="flex h-[22px] w-[22px] shrink-0 items-center justify-center rounded-[6px] bg-muted transition-colors duration-[120ms] group-hover:bg-muted-deeper md:hidden">
        <ArrowUpRight className="h-[11px] w-[11px] text-foreground" strokeWidth={2} aria-hidden />
      </div>
    </button>
  )
}
