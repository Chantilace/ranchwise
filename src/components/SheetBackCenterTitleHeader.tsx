import { ChevronLeft } from "lucide-react"
import type { ReactNode } from "react"
import { cn } from "@/lib/utils"

/**
 * Mobile sheet subview header: back control on the left, title centered in the row.
 */
export function SheetBackCenterTitleHeader({
  title,
  onBack,
  titleClassName,
}: {
  title: ReactNode
  onBack: () => void
  titleClassName?: string
}) {
  return (
    <div className="relative flex min-h-[3.25rem] shrink-0 items-center justify-center border-b border-border px-4 py-3">
      <button
        type="button"
        onClick={onBack}
        className="absolute top-1/2 left-4 flex -translate-y-1/2 items-center gap-1 text-[13px] text-muted-foreground outline-none focus-visible:ring-2 focus-visible:ring-ring/40"
      >
        <ChevronLeft className="size-3 shrink-0" aria-hidden />
        Back
      </button>
      <div
        className={cn(
          "min-w-0 max-w-[min(100%,calc(100%-5.5rem))] truncate px-10 text-center text-base font-medium text-foreground",
          titleClassName
        )}
      >
        {title}
      </div>
    </div>
  )
}
