import { Sparkle } from "lucide-react"

import { AiFilledSparkleIcon } from "@/components/icons/AiFilledSparkleIcon"
import { cn } from "@/lib/utils"

const SIZE_CLASS = {
  sm: "size-3.5",
  md: "size-4",
  lg: "size-5",
} as const

export type AiSurfaceMarkSize = keyof typeof SIZE_CLASS

type AiSurfaceMarkProps = {
  size?: AiSurfaceMarkSize
  /**
   * `true` (default): filled star — AI label / decoration on surfaces (not an invocation control).
   * `false`: Lucide Sparkle outline — reserve for rare non-button strokes matching legacy chips only.
   */
  filled?: boolean
  className?: string
}

/** Tier 2: Filled star by default (AI surface label). Use Lucide outline only when `filled={false}`. */
export function AiSurfaceMark({ size = "md", filled = true, className }: AiSurfaceMarkProps) {
  if (filled) {
    return <AiFilledSparkleIcon className={cn(SIZE_CLASS[size], className)} />
  }
  return (
    <Sparkle
      className={cn("shrink-0 text-ai-accent", SIZE_CLASS[size], className)}
      strokeWidth={1.5}
      aria-hidden
    />
  )
}
