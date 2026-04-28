import { Sparkle } from "lucide-react"
import type { ButtonHTMLAttributes } from "react"

import { cn } from "@/lib/utils"

export type AiActionButtonProps = {
  /** e.g. "Show AI suggestion" / "Hide AI suggestion" */
  ariaLabel: string
  expanded: boolean
  onClick: NonNullable<ButtonHTMLAttributes<HTMLButtonElement>["onClick"]>
  className?: string
}

/**
 * Tier 3: Disclosure for AI insight blocks (timeline, home cards). Outlined Lucide `Sparkle`
 * (singular); reserve filled marks to `AiAnnotationMark` where a passive label is needed.
 */
export function AiActionButton({ ariaLabel, expanded, onClick, className }: AiActionButtonProps) {
  return (
    <button
      type="button"
      className={cn(
        "group flex shrink-0 cursor-pointer items-center justify-center rounded p-1 transition-colors",
        "hover:bg-ai-accent-wash",
        "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ai-accent/40 focus-visible:ring-offset-1",
        expanded && "bg-ai-accent-wash/80",
        className
      )}
      aria-label={ariaLabel}
      aria-expanded={expanded}
      onClick={onClick}
    >
      <Sparkle
        className={cn(
          "size-5 text-ai-accent transition-transform duration-200 group-hover:scale-110",
          expanded && "scale-110 rotate-12",
        )}
        strokeWidth={1.75}
        aria-hidden
      />
    </button>
  )
}
