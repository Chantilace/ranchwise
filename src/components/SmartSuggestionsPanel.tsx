import { ChevronDown, ChevronUp } from "lucide-react"
import type { ReactNode } from "react"
import { useId, useState } from "react"
import { AiActionButton } from "@/components/ai/ai-action-button"
import { AiAnnotationMark } from "@/components/ai/ai-annotation-mark"
import { AiSurfaceMark } from "@/components/ai/ai-surface-mark"
import { cn } from "@/lib/utils"

/** 18px filled ✦ for Health / Pasture summary headers; label text scale stays independent. */
const SECTION_HEADER_GLYPH_CLASS =
  "inline-flex h-[18px] w-[18px] flex-shrink-0 items-center justify-center text-[18px] leading-none text-ai-accent"

export type SmartSuggestionsPanelProps = {
  mode: "modal" | "card"
  /** Badge / hero label (default "Smart suggestions"). */
  label?: string
  /**
   * `bullets`: list from `suggestions`. `prose`: single block from `body` (modal mode only).
   * When `bodyVariant === "prose"`, `body` wins; `suggestions` are ignored for the body area.
   */
  bodyVariant?: "bullets" | "prose"
  /** Bullet lines when `bodyVariant` is `"bullets"` (default). */
  suggestions?: readonly string[]
  /** Prose block when `bodyVariant` is `"prose"` (typically `mode="modal"`). */
  body?: string | ReactNode
  contextNote?: string | null
  /** Card-only: `bullets` vs `single-line` (modal always uses bullets layout for list mode). */
  variant?: "bullets" | "single-line"
  className?: string
  /** Overrides default `rounded-lg bg-muted px-3 py-2.5` surface for `mode="modal"` (e.g. flush inside a tinted card). */
  modalContentClassName?: string
  /** Extra classes for prose `body` paragraph / block (e.g. desktop editorial sizing). */
  proseBodyClassName?: string
  /** When true, label badge uses white bg for teal / tinted card surfaces. */
  onTint?: boolean
  /** When true, show larger icon + label instead of the badge row. */
  heroHeader?: boolean
  /** Tighter padding/typography for narrow columns (e.g. horse profile tablet HS + Care row). */
  profileCompact?: boolean
  /**
   * When `mode="modal"` with prose body: fill parent height, push `contextNote` to bottom (`mt-auto`).
   * Use in horse profile tablet column with `flex-1` siblings.
   */
  columnFill?: boolean
  /**
   * `section`: 18px `AiAnnotationMark` (periwinkle) in the label pill — profile summaries, log
   * observation / pasture check / calving result Smart Suggestions, etc.
   * `default`: standard `AiSurfaceMark` sm in the label pill.
   */
  labelGlyphStyle?: "default" | "section"
  /** Merged onto the label pill span (e.g. `rounded-full py-[3px]` for profile layouts). */
  labelPillClassName?: string
}

function SmartSuggestionsLabelRow({
  label,
  onTint,
  hero,
  compact,
  glyphStyle = "default",
  pillClassName,
}: {
  label: string
  onTint?: boolean
  hero?: boolean
  compact?: boolean
  glyphStyle?: "default" | "section"
  pillClassName?: string
}) {
  if (hero) {
    return (
      <div className="mb-3 flex items-center gap-2">
        <AiSurfaceMark size="lg" />
        <span className="text-sm font-medium uppercase tracking-[0.08em] text-ai-accent">{label}</span>
      </div>
    )
  }
  return (
    <div className={cn("mb-3", compact && "mb-2")}>
      <span
        className={cn(
          "inline-flex items-center gap-1.5 rounded-md px-2 py-1",
          onTint ? "border border-ai-accent/30 bg-white" : "border border-ai-accent bg-ai-accent-bg",
          pillClassName,
        )}
      >
        {glyphStyle === "section" ? (
          <AiAnnotationMark className={SECTION_HEADER_GLYPH_CLASS} />
        ) : (
          <AiSurfaceMark size="sm" />
        )}
        <span className="text-[13px] font-semibold uppercase tracking-wide text-ai-accent">
          {label}
        </span>
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
    <div>
      <div className="flex items-center justify-between gap-2">
        <div className={cn("min-w-0 flex-1 text-sm text-foreground")}>
          <p className="truncate">{suggestion}</p>
        </div>
        <AiActionButton
          ariaLabel={expanded ? "Hide AI suggestion" : "Show AI suggestion"}
          expanded={expanded}
          onClick={(e) => {
            e.stopPropagation()
            setExpanded((o) => !o)
          }}
        />
      </div>
      <div
        className={cn(
          "overflow-hidden transition-all duration-300 ease-out",
          expanded ? "mt-3 max-h-[500px] opacity-100" : "mt-0 max-h-0 opacity-0",
        )}
      >
        <p className="text-sm leading-relaxed text-foreground">{suggestion}</p>
      </div>
    </div>
  )
}

/**
 * Smart suggestions block per RanchWise spec.
 * - Modal (post-analyze): expanded, label visible, bullets or prose, no chevron.
 * - Log card: collapsed by default (first item only, truncated), expandable to show label + bullets.
 *
 * Precedence: when `bodyVariant === "prose"`, the prose `body` is shown and `suggestions` are not rendered
 * as a list (they may still be passed for API symmetry but are ignored).
 */
export function SmartSuggestionsPanel({
  mode,
  label = "Smart suggestions",
  bodyVariant = "bullets",
  suggestions = [],
  body,
  contextNote,
  variant = "bullets",
  className,
  modalContentClassName,
  onTint,
  heroHeader,
  profileCompact,
  columnFill,
  labelGlyphStyle = "default",
  proseBodyClassName,
  labelPillClassName,
}: SmartSuggestionsPanelProps) {
  const [expanded, setExpanded] = useState(mode === "modal")
  const contentId = useId()

  const effectiveBodyVariant: "bullets" | "prose" =
    mode === "modal" ? bodyVariant : "bullets"

  const hasProseBody =
    effectiveBodyVariant === "prose" &&
    body != null &&
    (typeof body !== "string" || body.trim().length > 0)

  const hasBulletContent = effectiveBodyVariant === "bullets" && suggestions.length > 0

  if (!hasProseBody && !hasBulletContent) return null

  const firstSuggestion = suggestions[0] ?? ""
  const collapsedSuggestion =
    suggestions.length <= 1 ? firstSuggestion : `${firstSuggestion}…`

  const effectiveVariant: "bullets" | "single-line" = mode === "modal" ? "bullets" : variant

  const showLabel = effectiveVariant === "bullets" && (mode === "modal" ? true : expanded)

  const proseBodyBaseClass = proseBodyClassName
    ? proseBodyClassName
    : profileCompact
      ? "text-[13px] leading-[1.4]"
      : "text-sm leading-relaxed"

  const proseBodyNode =
    effectiveBodyVariant === "prose" ? (
      typeof body === "string" ? (
        <p className={cn("text-foreground", proseBodyBaseClass)}>{body}</p>
      ) : (
        <div className={cn("text-foreground", proseBodyBaseClass)}>{body}</div>
      )
    ) : null

  return (
    <div className={cn("min-w-0", columnFill ? "flex h-full min-h-0 flex-col" : "mt-2", className)}>
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
            <div className="mt-1.5 h-1.5 w-1.5 flex-shrink-0 rounded-full bg-ai-accent" aria-hidden />
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
                <SmartSuggestionsLabelRow
                  label={label}
                  onTint={onTint}
                  hero={heroHeader}
                  compact={profileCompact}
                  glyphStyle={labelGlyphStyle}
                  pillClassName={labelPillClassName}
                />
              </div>
              <ChevronUp className="mt-0.5 size-3.5 shrink-0 text-muted-foreground" />
            </div>
            <SuggestionRows suggestions={suggestions} />
          </button>
        )
      ) : columnFill && effectiveBodyVariant === "prose" && hasProseBody ? (
        <div
          id={contentId}
          className={cn(
            "flex min-h-0 min-w-0 flex-1 flex-col rounded-lg bg-muted",
            profileCompact ? "p-3" : "px-3 py-2.5",
            modalContentClassName,
          )}
        >
          {showLabel ? (
            <div className="shrink-0">
              <SmartSuggestionsLabelRow
                label={label}
                onTint={onTint}
                hero={heroHeader}
                compact={profileCompact}
                glyphStyle={labelGlyphStyle}
                pillClassName={labelPillClassName}
              />
            </div>
          ) : null}
          <div className="min-h-0 flex-1">{proseBodyNode}</div>
          {contextNote ? (
            <p className="mt-auto shrink-0 pt-2 text-[13px] leading-relaxed text-muted-foreground">
              {contextNote}
            </p>
          ) : null}
        </div>
      ) : (
        <div
          id={contentId}
          className={cn(
            "min-w-0 rounded-lg bg-muted",
            profileCompact ? "p-3" : "px-3 py-2.5",
            modalContentClassName,
          )}
        >
          {showLabel ? (
            <SmartSuggestionsLabelRow
              label={label}
              onTint={onTint}
              hero={heroHeader}
              compact={profileCompact}
              glyphStyle={labelGlyphStyle}
              pillClassName={labelPillClassName}
            />
          ) : null}

          {effectiveBodyVariant === "prose" ? (
            proseBodyNode
          ) : effectiveVariant === "single-line" ? (
            <div className="flex min-w-0 items-start gap-2.5 py-2">
              <div className="mt-1.5 h-1.5 w-1.5 flex-shrink-0 rounded-full bg-ai-accent" aria-hidden />
              <p className="min-w-0 break-words text-sm text-foreground">{firstSuggestion}</p>
            </div>
          ) : (
            <SuggestionRows suggestions={suggestions} />
          )}

          {contextNote ? (
            <p className="mt-2 text-[13px] leading-relaxed text-muted-foreground">
              {contextNote}
            </p>
          ) : null}
        </div>
      )}
    </div>
  )
}
