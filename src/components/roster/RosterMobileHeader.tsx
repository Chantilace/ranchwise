import type { ReactNode } from "react"
import { ROSTER_HEADCOUNT_BADGE_CLASS } from "@/lib/categoryBadgeClass"
import { cn } from "@/lib/utils"

export type RosterMobileHeaderStatusItem = {
  label: string
  count: number
  /** Tailwind classes for the status dot (e.g. bg-badge-good-mid-bg). */
  dotClassName: string
}

type RosterMobileHeaderProps = {
  title: string
  count: number
  /** Lowercase plural for the count chip, e.g. "horses". */
  entityLabel: string
  statusItems: RosterMobileHeaderStatusItem[]
  addCta: ReactNode
  className?: string
}

export function RosterMobileHeader({
  title,
  count,
  entityLabel,
  statusItems,
  addCta,
  className,
}: RosterMobileHeaderProps) {
  return (
    <header className={cn("mb-3 flex items-start justify-between gap-3", className)}>
      <div className="flex min-w-0 flex-col">
        <div className="flex flex-wrap items-center gap-2">
          <h1 className="text-[22px] font-medium tracking-normal text-foreground sm:text-[24px]">{title}</h1>
          <span className={ROSTER_HEADCOUNT_BADGE_CLASS}>
            {count} {entityLabel}
          </span>
        </div>
        <div className="mt-1.5 flex flex-wrap items-center gap-2.5">
          {statusItems.map((item) => (
            <span key={item.label} className="flex items-center gap-1.5 text-[13px] text-muted-foreground">
              <span className={cn("size-1.5 shrink-0 rounded-full", item.dotClassName)} aria-hidden />
              <span>
                {item.label} {item.count}
              </span>
            </span>
          ))}
        </div>
      </div>
      <div className="shrink-0 pt-0.5">{addCta}</div>
    </header>
  )
}
