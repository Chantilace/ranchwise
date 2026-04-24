import { Sparkles } from "lucide-react"
import type { ButtonHTMLAttributes } from "react"

import { cn } from "@/lib/utils"

export type AiSparkleDisclosureButtonProps = {
  /** e.g. "Show AI suggestion" / "Hide AI suggestion" */
  ariaLabel: string
  expanded: boolean
  onClick: NonNullable<ButtonHTMLAttributes<HTMLButtonElement>["onClick"]>
  className?: string
}

/**
 * Icon-only control to expand/collapse AI suggestion text (RanchWise AI accent).
 */
export function AiSparkleDisclosureButton({
  ariaLabel,
  expanded,
  onClick,
  className,
}: AiSparkleDisclosureButtonProps) {
  return (
    <button
      type="button"
      className={cn(
        "flex shrink-0 cursor-pointer items-center justify-center rounded p-1 transition-colors",
        "hover:bg-ai-accent-bg/70",
        "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ai-accent/40 focus-visible:ring-offset-1",
        expanded && "bg-ai-accent-bg/40",
        className
      )}
      aria-label={ariaLabel}
      aria-expanded={expanded}
      onClick={onClick}
    >
      <Sparkles className="size-5 text-ai-accent" strokeWidth={1.5} aria-hidden />
    </button>
  )
}
