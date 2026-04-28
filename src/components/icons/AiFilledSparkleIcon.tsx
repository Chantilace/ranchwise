import { cn } from "@/lib/utils"

/** Filled four-point star — default for `AiSurfaceMark` (AI surface label, not an invocation control). */
export function AiFilledSparkleIcon({ className }: { className?: string }) {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="currentColor"
      className={cn("shrink-0 text-ai-accent", className)}
      aria-hidden
    >
      <path d="M12 2L13.5 8.5L20 10L13.5 11.5L12 18L10.5 11.5L4 10L10.5 8.5L12 2Z" />
    </svg>
  )
}
