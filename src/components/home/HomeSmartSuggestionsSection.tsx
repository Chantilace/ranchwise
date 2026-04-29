import { useCallback, useEffect, useMemo, useRef, useState } from "react"
import { ArrowUpRight, RefreshCw } from "lucide-react"
import { Link } from "react-router-dom"
import { AiAnnotationMark } from "@/components/ai/ai-annotation-mark"
import { useRanchData } from "@/contexts/RanchDataContext"
import {
  buildHomeSmartSuggestionCardsModel,
  type SmartSuggestionCardPriority,
} from "@/lib/homeSmartSuggestionCards"
import { homepageSoftShadowClass } from "@/lib/homePageCardChrome"
import { cn } from "@/lib/utils"

function priorityLabel(p: SmartSuggestionCardPriority): string {
  if (p === "high") return "High priority"
  if (p === "watch") return "Watch"
  return "Routine"
}

const SUGGESTION_SLIDE_COUNT = 3

const suggestionsTrackClass = cn(
  "flex min-w-0 gap-3 overflow-x-auto pb-2 snap-x snap-mandatory scrollbar-hide",
  "xl:grid xl:grid-cols-3 xl:gap-3 xl:overflow-visible xl:pb-0 xl:snap-none",
)

const smartSuggestionCardLinkClass = cn(
  "group flex min-h-[140px] min-w-0 flex-col rounded-[var(--radius)] bg-[var(--ai-accent-deep)] p-4 text-[var(--ai-accent-soft)]",
  "touch-manipulation no-underline outline-none transition-colors duration-150 ease-out",
  // Hover needs to be perceptible; brighten toward periwinkle.
  "hover:bg-[var(--ai-hover)] active:scale-[0.99]",
  "focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background",
  "w-[80%] max-w-[320px] shrink-0 snap-start",
  "lg:w-[420px] lg:max-w-none",
  "xl:w-auto xl:min-w-0 xl:shrink",
  homepageSoftShadowClass,
)

type HomeSmartSuggestionCardProps = {
  to: string
  ariaLabel: string
  priority: SmartSuggestionCardPriority
  categoryLabel: string
  statement: string
}

function HomeSmartSuggestionCard({
  to,
  ariaLabel,
  priority,
  categoryLabel,
  statement,
}: HomeSmartSuggestionCardProps) {
  return (
    <Link to={to} className={smartSuggestionCardLinkClass} aria-label={ariaLabel}>
      <div className="mb-2.5 flex items-center justify-between gap-2">
        <div className="flex min-w-0 items-center gap-1.5">
          <div
            className="flex size-[22px] shrink-0 items-center justify-center rounded-md"
            style={{ background: "var(--ai-accent-mid)" }}
          >
            <AiAnnotationMark className="text-[13px] text-white" />
          </div>
          <span className="min-w-0 truncate text-[13px] font-medium uppercase tracking-[0.6px] text-[var(--ai-accent-muted)] group-hover:text-white">
            {categoryLabel}
          </span>
        </div>
        <ArrowUpRight
          className="h-4 w-4 shrink-0 text-white transition-transform duration-200 ease-out group-hover:-translate-y-0.5 group-hover:translate-x-0.5"
          strokeWidth={2.25}
          aria-hidden
        />
      </div>

      <p className="mb-3 min-w-0 flex-1 text-[14px] leading-snug text-white">{statement}</p>

      <span
        className="self-start rounded-full bg-transparent px-2 py-[1px] text-[13px] font-medium text-[var(--ai-accent-soft)] border border-[rgba(207,203,246,0.35)] group-hover:text-white"
      >
        {priorityLabel(priority)}
      </span>
    </Link>
  )
}

export function HomeSmartSuggestionsSection() {
  const { cattle, observationsByCattleId, herdRows, observationsByHorse, pastures } = useRanchData()

  const model = useMemo(
    () =>
      buildHomeSmartSuggestionCardsModel({
        cattle,
        observationsByCattleId,
        herdRows,
        observationsByHorse,
        pastures,
      }),
    [cattle, observationsByCattleId, herdRows, observationsByHorse, pastures]
  )

  const { cattle: cattleInsight, horse: horseInsight, pasture: pastureInsight } = model

  const scrollContainerRef = useRef<HTMLDivElement>(null)
  const [activeSlideIndex, setActiveSlideIndex] = useState(0)

  const updateActiveSlideFromScroll = useCallback(() => {
    const container = scrollContainerRef.current
    if (!container) return
    const slides = [...container.children].filter(
      (n): n is HTMLElement => n instanceof HTMLElement && n.tagName === "A",
    )
    if (slides.length === 0) return
    const centerX = container.scrollLeft + container.clientWidth / 2
    let bestIdx = 0
    let bestDist = Infinity
    slides.forEach((card, i) => {
      const mid = card.offsetLeft + card.offsetWidth / 2
      const d = Math.abs(centerX - mid)
      if (d < bestDist) {
        bestDist = d
        bestIdx = i
      }
    })
    setActiveSlideIndex(Math.min(bestIdx, slides.length - 1))
  }, [])

  useEffect(() => {
    const container = scrollContainerRef.current
    if (!container) return
    updateActiveSlideFromScroll()
    container.addEventListener("scroll", updateActiveSlideFromScroll, { passive: true })
    const ro = new ResizeObserver(() => updateActiveSlideFromScroll())
    ro.observe(container)
    return () => {
      container.removeEventListener("scroll", updateActiveSlideFromScroll)
      ro.disconnect()
    }
  }, [updateActiveSlideFromScroll, model])

  const scrollToSlide = useCallback((idx: number) => {
    const container = scrollContainerRef.current
    const slide = container?.children[idx] as HTMLElement | undefined
    slide?.scrollIntoView({ behavior: "smooth", inline: "start", block: "nearest" })
  }, [])

  return (
    <section className="flex min-w-0 flex-col gap-3" aria-label="Smart suggestions">
      <div className="flex min-w-0 flex-wrap items-center justify-between gap-x-3 gap-y-2">
        <div className="flex min-w-0 items-center gap-2">
          <AiAnnotationMark className="text-[18px] leading-none text-ai-accent" />
          <span className="text-[15px] font-medium leading-none text-foreground">Smart Suggestions</span>
        </div>
        <div className="ml-auto flex shrink-0 items-center gap-2">
          <span className="text-[13px] text-muted-foreground">Updated 6 min ago</span>
          <button
            type="button"
            aria-label="Refresh"
            className={cn(
              "group/refresh cursor-pointer border-0 bg-transparent p-1 text-[var(--color-text-tertiary)] transition-[color_150ms_ease,transform_400ms_ease]",
              "hover:text-[var(--ai-accent)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background"
            )}
          >
            <RefreshCw
              className="size-4 transition-transform duration-[400ms] ease-out group-hover/refresh:rotate-[360deg]"
              strokeWidth={2}
              aria-hidden
            />
          </button>
        </div>
      </div>

      <div ref={scrollContainerRef} className={suggestionsTrackClass}>
        <HomeSmartSuggestionCard
          to={cattleInsight.ctaHref}
          ariaLabel={`Cattle: ${cattleInsight.statement}`}
          priority={cattleInsight.priority}
          categoryLabel="Cattle"
          statement={cattleInsight.statement}
        />

        <HomeSmartSuggestionCard
          to={horseInsight.ctaHref}
          ariaLabel={`${horseInsight.categoryLabel}: ${horseInsight.statement}`}
          priority={horseInsight.priority}
          categoryLabel={horseInsight.categoryLabel}
          statement={horseInsight.statement}
        />

        <HomeSmartSuggestionCard
          to={pastureInsight.ctaHref}
          ariaLabel={`Pastures: ${pastureInsight.statement}`}
          priority={pastureInsight.priority}
          categoryLabel="Pastures"
          statement={pastureInsight.statement}
        />
      </div>

      <div
        className="flex justify-center gap-1.5 xl:hidden"
        role="tablist"
        aria-label="Smart suggestion slides"
      >
        {Array.from({ length: SUGGESTION_SLIDE_COUNT }, (_, idx) => (
          <button
            key={idx}
            type="button"
            role="tab"
            aria-selected={activeSlideIndex === idx}
            aria-label={`Go to smart suggestion ${idx + 1} of ${SUGGESTION_SLIDE_COUNT}`}
            onClick={() => scrollToSlide(idx)}
            className={cn(
              "h-1.5 w-1.5 shrink-0 rounded-full transition-colors duration-200 ease-out outline-none",
              "focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background",
              activeSlideIndex === idx
                ? "bg-[var(--ai-accent)]"
                : "bg-[var(--color-border-tertiary)]",
            )}
          />
        ))}
      </div>
    </section>
  )
}
