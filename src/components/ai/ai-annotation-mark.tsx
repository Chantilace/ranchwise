import { cn } from "@/lib/utils"

/** Tier 1: Unicode ✦ inline before AI-assessed copy (default periwinkle brand color). */
export function AiAnnotationMark({ className }: { className?: string }) {
  return (
    <span className={cn("select-none text-ai-accent", className)} aria-hidden>
      ✦
    </span>
  )
}
