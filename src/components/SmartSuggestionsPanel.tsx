import { ChevronDown, ChevronUp, Sparkles } from "lucide-react"
import { useId, useMemo, useState } from "react"
import { cn } from "@/lib/utils"

export type SmartSuggestionsPanelProps = {
  suggestions: readonly string[]
  contextNote?: string | null
  /** `modal`: always expanded, no chevron. `card`: collapsible, collapsed by default. */
  mode: "modal" | "card"
  /** `bullets`: multi-suggestion list with label on expand. `single-line`: pasture-style line with chevron only. */
  variant?: "bullets" | "single-line"
  className?: string
  /** Overrides default `rounded-lg bg-muted px-3 py-2.5` surface for `mode="modal"` (e.g. flush inside a tinted card). */
  modalContentClassName?: string
  /** When true, label badge uses white bg for teal / tinted card surfaces. */
  onTint?: boolean
  /** When true, show larger icon + label instead of the badge row. */
  heroHeader?: boolean
}

function SmartSuggestionsLabelRow({ onTint, hero }: { onTint?: boolean; hero?: boolean }) {
  if (hero) {
    return (
      <div className="mb-3 flex items-center gap-2">
        <Sparkles className="size-5 text-ai-accent" strokeWidth={1.5} aria-hidden />
        <span className="text-sm font-medium uppercase tracking-[0.08em] text-ai-accent">
          Smart suggestions
        </span>
      </div>
    )
  }
  return (
    <div className="mb-3">
      <span
        className={cn(
          "inline-flex items-center gap-1.5 rounded-md px-2 py-1",
          onTint
            ? "border border-ai-accent/30 bg-white"
            : "border border-ai-accent bg-ai-accent-bg"
        )}
      >
        <Sparkles className="size-3.5 text-ai-accent" strokeWidth={1.5} aria-hidden />
        <span className="text-xs font-semibold uppercase tracking-wide text-ai-accent">Smart suggestions</span>
      </span>
    </div>
  )
}

function SuggestionRows({ suggestions }: { suggestions: readonly string[] }) {
  return (
    <>
      {suggestions.map((suggestion, i) => (
        <div
          key={`${i}-${suggestion.slice(0, 12)}`}
          className="flex min-w-0 items-start gap-2.5 py-2"
        >
          <div className="mt-1.5 h-1.5 w-1.5 flex-shrink-0 rounded-full bg-ai-accent" aria-hidden />
          <p className="min-w-0 break-words text-sm text-foreground">{suggestion}</p>
        </div>
      ))}
    </>
  )
}

function SingleLineCard({ suggestion }: { suggestion: string }) {
  const [expanded, setExpanded] = useState(false)

  return (
    <div className="flex items-center justify-between gap-2">
      <div className={cn("min-w-0 flex-1 text-sm text-foreground", !expanded && "")}>
        {expanded ? (
          <p className="leading-relaxed">{suggestion}</p>
        ) : (
          <p className="truncate">{suggestion}</p>
        )}
      </div>
      <button
        type="button"
        className="flex shrink-0 items-center justify-center rounded p-1 outline-none focus-visible:ring-2 focus-visible:ring-ring/40"
        aria-label={expanded ? "Hide AI suggestion" : "Show AI suggestion"}
        aria-expanded={expanded}
        onClick={(e) => {
          e.stopPropagation()
          setExpanded((o) => !o)
        }}
      >
        <Sparkles className="size-5 text-ai-accent" strokeWidth={1.5} aria-hidden />
      </button>
    </div>
  )
}

/**
 * Smart suggestions block per RanchWise spec.
 * - Modal (post-analyze): expanded, label visible, bullets shown, no chevron.
 * - Log card: collapsed by default (first item only, truncated), expandable to show label + bullets.
 */
export function SmartSuggestionsPanel({
  suggestions,
  contextNote,
  mode,
  variant = "bullets",
  className,
  modalContentClassName,
  onTint,
  heroHeader,
}: SmartSuggestionsPanelProps) {
  const [expanded, setExpanded] = useState(mode === "modal")
  const contentId = useId()

  if (!suggestions.length) return null

  const firstSuggestion = suggestions[0] ?? ""
  const collapsedSuggestion = useMemo(() => {
    if (suggestions.length <= 1) return firstSuggestion
    return `${firstSuggestion}…`
  }, [firstSuggestion, suggestions.length])

  const effectiveVariant: "bullets" | "single-line" = mode === "modal" ? "bullets" : variant

  const showLabel = effectiveVariant === "bullets" && (mode === "modal" ? true : expanded)

  return (
    <div className={cn("mt-2 min-w-0", className)}>
      {mode === "card" ? (
        effectiveVariant === "single-line" ? (
          <SingleLineCard suggestion={firstSuggestion} />
        ) : !expanded ? (
          <button
            type="button"
            className="flex w-full items-start gap-2.5 rounded-lg bg-muted px-3 py-2.5 text-left outline-none focus-visible:ring-2 focus-visible:ring-ring/40"
            aria-expanded={expanded}
            aria-controls={contentId}
            onClick={(e) => {
              e.stopPropagation()
              setExpanded(true)
            }}
          >
            <div className="w-1.5 h-1.5 flex-shrink-0 rounded-full bg-ai-accent mt-1.5" aria-hidden />
            <p className="flex-1 truncate text-sm text-foreground">{collapsedSuggestion}</p>
            <ChevronDown className="mt-0.5 size-3.5 flex-shrink-0 text-muted-foreground" aria-hidden />
          </button>
        ) : (
          <button
            id={contentId}
            type="button"
            className="flex w-full flex-col rounded-lg bg-muted px-3 py-2.5 text-left"
            aria-expanded={expanded}
            onClick={(e) => {
              e.stopPropagation()
              setExpanded(false)
            }}
          >
            <div className="flex items-start gap-2">
              <div className="min-w-0 flex-1">
                <SmartSuggestionsLabelRow onTint={onTint} hero={heroHeader} />
              </div>
              <ChevronUp className="mt-0.5 size-3.5 shrink-0 text-muted-foreground" />
            </div>
            <SuggestionRows suggestions={suggestions} />
          </button>
        )
      ) : (
        <div
          id={contentId}
          className={cn("min-w-0 rounded-lg bg-muted px-3 py-2.5", modalContentClassName)}
        >
          {showLabel ? <SmartSuggestionsLabelRow onTint={onTint} hero={heroHeader} /> : null}

          {effectiveVariant === "single-line" ? (
            <div className="flex min-w-0 items-start gap-2.5 py-2">
              <div className="mt-1.5 h-1.5 w-1.5 flex-shrink-0 rounded-full bg-ai-accent" aria-hidden />
              <p className="min-w-0 break-words text-sm text-foreground">{firstSuggestion}</p>
            </div>
          ) : (
            <SuggestionRows suggestions={suggestions} />
          )}

          {contextNote ? (
            <p className="mt-2 text-xs leading-relaxed text-muted-foreground">{contextNote}</p>
          ) : null}
        </div>
      )}
    </div>
  )
}
