import { Sparkles } from "lucide-react"

import { cn } from "@/lib/utils"

const MAX_HOME_SUGGESTIONS = 3

export function HomeSmartSuggestionsCard({
  suggestions,
  className,
}: {
  suggestions: readonly string[]
  className?: string
}) {
  const list = suggestions.slice(0, MAX_HOME_SUGGESTIONS)
  if (!list.length) return null

  return (
    <div
      className={cn(
        "shadow-ai-smart flex w-full min-w-0 flex-col self-start rounded-xl border-[0.5px] border-[var(--smart-suggestions-card-border)] bg-ai-accent-bg px-[18px] py-4",
        className
      )}
    >
      <div className="mb-3 flex items-center gap-2">
        <Sparkles className="size-5 shrink-0 text-ai-accent-text" strokeWidth={1.7} aria-hidden />
        <span className="text-xs font-medium uppercase tracking-[0.08em] text-ai-accent-text">
          Smart suggestions
        </span>
      </div>
      <ul
        className={cn(
          "m-0 list-none p-0",
          "flex flex-col gap-2.5",
          "md:max-lg:grid md:max-lg:grid-cols-3 md:max-lg:gap-x-4 md:max-lg:gap-y-2"
        )}
      >
        {list.map((s, i) => (
          <li
            key={`${i}-${s.slice(0, 20)}`}
            className="relative min-w-0 pl-3 text-xs leading-[1.45] text-foreground"
          >
            <span
              className="absolute left-0 top-[6px] h-1 w-1 rounded-full bg-ai-accent-text"
              aria-hidden
            />
            {s}
          </li>
        ))}
      </ul>
    </div>
  )
}
