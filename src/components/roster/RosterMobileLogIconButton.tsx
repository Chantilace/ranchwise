import { NotebookPen } from "lucide-react"
import type { MouseEvent } from "react"
import { cn } from "@/lib/utils"

type RosterMobileLogIconButtonProps = {
  ariaLabel: string
  onClick: (e: MouseEvent<HTMLButtonElement>) => void
  className?: string
}

/** Circular log trigger — preserves existing sheet/modal handlers; visual only. */
export function RosterMobileLogIconButton({ ariaLabel, onClick, className }: RosterMobileLogIconButtonProps) {
  return (
    <button
      type="button"
      aria-label={ariaLabel}
      onClick={onClick}
      className={cn(
        "group flex size-8 shrink-0 items-center justify-center rounded-full border-[0.5px] border-ai-accent bg-card text-ai-accent transition-colors hover:bg-ai-accent",
        className,
      )}
    >
      <NotebookPen
        className="size-3.5 shrink-0 text-ai-accent transition-colors group-hover:text-white"
        strokeWidth={2}
        aria-hidden
      />
    </button>
  )
}
