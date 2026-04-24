import { cn } from "@/lib/utils"

/** Sparkle used for Smart suggestions header and compact pasture AI lines (`--ai-accent-text`). */
export function SmartSuggestionsSparkleIcon({
  className,
  size = 18,
}: {
  className?: string
  size?: 14 | 18
}) {
  return (
    <svg
      className={cn("shrink-0 text-ai-accent", className)}
      width={size}
      height={size}
      viewBox="0 0 16 16"
      fill="none"
      aria-hidden
    >
      <path
        d="M8 1l1.2 3.8L13 6l-3.8 1.2L8 11l-1.2-3.8L3 6l3.8-1.2z"
        fill="none"
        stroke="currentColor"
        strokeWidth={1.2}
        strokeLinejoin="round"
      />
      <circle cx="12.5" cy="2.5" r="0.9" fill="none" stroke="currentColor" strokeWidth={1} />
      <circle cx="3.5" cy="11.5" r="0.6" fill="none" stroke="currentColor" strokeWidth={1} />
    </svg>
  )
}

function SmartSuggestionBulletIcon({ className }: { className?: string }) {
  return (
    <svg
      className={cn("shrink-0", className)}
      width={12}
      height={12}
      viewBox="0 0 16 16"
      fill="none"
      aria-hidden
    >
      <path d="M8 2l1 3L12 6l-3 1-1 3-1-3-3-1 3-1z" fill="currentColor" />
    </svg>
  )
}

export type SmartSuggestionsBlockProps = {
  suggestions: readonly string[]
  className?: string
}

/** RanchWise “Smart suggestions” — header + star bullets; uses AI accent text token. */
export function SmartSuggestionsBlock({ suggestions, className }: SmartSuggestionsBlockProps) {
  if (suggestions.length === 0) return null

  return (
    <div className={className}>
      <div className="mb-2 inline-flex items-center gap-1.5 text-ai-accent">
        <SmartSuggestionsSparkleIcon size={18} />
        <span className="text-xs leading-none font-normal">Smart suggestions</span>
      </div>
      <div className="pl-6">
        {suggestions.map((text, i) => (
          <div
            key={i}
            className="mb-[5px] flex items-start gap-2 text-sm leading-[1.55] text-muted-foreground last:mb-0"
          >
            <SmartSuggestionBulletIcon className="mt-[3px] h-3 w-3 text-ai-accent" />
            <span>{text}</span>
          </div>
        ))}
      </div>
    </div>
  )
}
