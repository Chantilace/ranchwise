import { ArrowRight, Sparkles } from "lucide-react"
import { useState } from "react"
import { Link } from "react-router-dom"
import { Button, buttonVariants } from "@/components/ui/button"
import { cn } from "@/lib/utils"

export interface SmartSuggestion {
  id: string
  title: string
  reasoning: string
  action: { label: string; href?: string; onClick?: () => void }
}

type HomeSmartSuggestionsCardProps = {
  suggestions: readonly SmartSuggestion[]
}

const MAX_VISIBLE = 3

export function HomeSmartSuggestionsCard({ suggestions }: HomeSmartSuggestionsCardProps) {
  const [dismissed, setDismissed] = useState<Set<string>>(new Set())

  const active = suggestions.filter((s) => !dismissed.has(s.id))
  const visible = active.slice(0, MAX_VISIBLE)
  const overflow = active.length - visible.length

  const dismiss = (id: string) => setDismissed((prev) => new Set(prev).add(id))

  return (
    <section className="flex flex-col rounded-lg border border-ai-accent/20 bg-ai-accent-wash p-5">
      <div className="mb-3 flex items-center justify-between gap-2">
        <span className="inline-flex items-center gap-1.5 rounded-md border border-ai-accent bg-ai-accent-bg px-2 py-1">
          <Sparkles className="size-5 fill-current text-ai-accent" strokeWidth={1.5} aria-hidden />
          <span className="text-[13px] font-semibold uppercase tracking-[0.05em] text-ai-accent">
            Smart suggestions
          </span>
        </span>
        {active.length > 0 && (
          <span className="inline-flex items-center rounded-full bg-ai-accent px-2 py-[3px] text-[11px] font-medium text-white">
            {active.length} today
          </span>
        )}
      </div>

      {active.length === 0 ? (
        <div className="flex flex-col items-center gap-2 rounded-lg bg-muted p-6 text-center">
          <div className="flex size-8 items-center justify-center rounded-md bg-ai-accent-bg">
            <Sparkles className="size-4 text-ai-accent" aria-hidden />
          </div>
          <p className="text-xs font-medium text-foreground">You're all caught up</p>
          <p className="text-[11px] leading-[1.5] text-muted-foreground">
            AI is watching your ranch data. New suggestions will appear here.
          </p>
        </div>
      ) : (
        <>
          <div className="flex flex-col">
            {visible.map((s, idx) => (
              <div
                key={s.id}
                className={cn(
                  "flex flex-col gap-2 py-3",
                  idx > 0 && "border-t-[0.5px] border-border"
                )}
              >
                <p className="text-sm font-medium leading-[1.4] text-foreground">{s.title}</p>
                <p className="text-xs leading-[1.5] text-muted-foreground">{s.reasoning}</p>
                <div className="flex flex-wrap items-center gap-3">
                  {s.action.href ? (
                    <Link
                      to={s.action.href}
                      className={buttonVariants({ variant: "primary", size: "sm" })}
                    >
                      {s.action.label}
                    </Link>
                  ) : (
                    <Button type="button" variant="primary" size="sm" onClick={s.action.onClick}>
                      {s.action.label}
                    </Button>
                  )}
                  <button
                    type="button"
                    onClick={() => dismiss(s.id)}
                    className="inline-flex shrink-0 cursor-pointer items-center justify-center rounded-full border border-border bg-transparent px-3 py-1.5 text-xs font-medium text-muted-foreground outline-none transition-colors hover:bg-muted hover:text-foreground focus-visible:ring-2 focus-visible:ring-ring/40"
                  >
                    Dismiss
                  </button>
                </div>
              </div>
            ))}
          </div>
          {overflow > 0 && (
            <button
              type="button"
              // TODO: wire up expand behavior when overflow is non-zero.
              className="mt-2 inline-flex items-center gap-1 self-start text-[12px] font-medium text-action hover:underline"
            >
              View {overflow} more {overflow === 1 ? "suggestion" : "suggestions"}
              <ArrowRight className="size-3" aria-hidden />
            </button>
          )}
        </>
      )}
    </section>
  )
}
