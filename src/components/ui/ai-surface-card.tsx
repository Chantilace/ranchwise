import type { ReactNode } from "react"

import { AiSurfaceMark } from "@/components/ai/ai-surface-mark"
import { cn } from "@/lib/utils"

/**
 * AiSurfaceCard — heavyweight AI feature card with periwinkle wash background.
 * Use for primary AI features that anchor a page or section as a destination
 * (e.g., Smart Suggestions on the homepage).
 *
 * For embedded AI context (summaries, suggestions inline within other content),
 * use SmartSuggestionsPanel instead — it has the appropriate lighter visual weight.
 */

export type AiSurfaceCardProps = {
  label: string
  pill?: {
    text: string
    /** Reserved for future styling splits; count and label use the same chrome today. */
    variant?: "count" | "label"
  }
  children: ReactNode
  footer?: string
  className?: string
}

export function AiSurfaceCard({ label, pill, children, footer, className }: AiSurfaceCardProps) {
  return (
    <section
      className={cn(
        "flex flex-col rounded-2xl bg-ai-accent-wash px-5 py-[18px]",
        className
      )}
    >
      <div className="mb-4 flex items-center justify-between gap-2">
        <span className="inline-flex items-center gap-2 rounded-lg bg-ai-accent px-3 py-1.5">
          <AiSurfaceMark size="md" className="text-white" />
          <span className="text-[13px] font-bold uppercase tracking-[0.06em] text-white">{label}</span>
        </span>
        {pill ? (
          <span className="inline-flex items-center rounded-full border border-ai-accent bg-transparent px-2.5 py-0.5 text-[13px] font-medium text-ai-accent">
            {pill.text}
          </span>
        ) : null}
      </div>
      {children}
      {footer ? (
        <p className="mt-3 text-[13px] leading-[1.5] text-muted-foreground">{footer}</p>
      ) : null}
    </section>
  )
}
