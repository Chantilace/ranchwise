import type { ReactNode } from "react"
import { cn } from "@/lib/utils"

export type PageTitleStripProps = {
  title: string
  description?: ReactNode
  /** Controls placed to the right of the title on the same row (e.g. view mode). */
  inlineAfterTitle?: ReactNode
  actions?: ReactNode
  className?: string
  /** Override default h1 typography (e.g. Figma heading-4 on Cattle). */
  titleClassName?: string
}

export function PageTitleStrip({
  title,
  description,
  inlineAfterTitle,
  actions,
  className,
  titleClassName,
}: PageTitleStripProps) {
  return (
    <div className={cn("border-b border-border pb-3", className)}>
      <div className="flex items-start justify-between gap-3">
        <div className="flex min-w-0 flex-1 flex-col gap-1">
          <div className="flex min-w-0 flex-wrap items-center gap-x-3 gap-y-1 sm:gap-x-4">
            <div className="min-w-0 shrink-0">
              <h1
                className={cn(
                  "text-xl font-medium tracking-tight text-foreground",
                  titleClassName
                )}
              >
                {title}
              </h1>
              {description != null ? (
                <div className="mt-0.5 text-sm text-muted-foreground">{description}</div>
              ) : null}
            </div>
            {inlineAfterTitle ? (
              <div className="flex min-w-0 flex-wrap items-center gap-x-3.5 gap-y-2">{inlineAfterTitle}</div>
            ) : null}
          </div>
        </div>
        {actions ? <div className="flex shrink-0 items-start justify-end">{actions}</div> : null}
      </div>
    </div>
  )
}
