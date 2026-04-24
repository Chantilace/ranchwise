import { StatusBadge } from "@/components/StatusBadge"
import { SmartSuggestionsPanel } from "@/components/SmartSuggestionsPanel"
import type { AIResult } from "@/types/observation"
import { cn } from "@/lib/utils"

export interface AIResultBlockProps {
  result: AIResult
  variant?: "inline" | "modal"
}

export function AIResultBlock({ result, variant = "inline" }: AIResultBlockProps) {
  return (
    <div
      className={cn(
        "rounded-lg border border-border bg-muted/20",
        variant === "inline" ? "p-3" : "p-4"
      )}
    >
      <div className="mb-2 flex items-center justify-between">
        <StatusBadge status={result.riskLevel} size="sm" />
      </div>

      <SmartSuggestionsPanel
        mode={variant === "modal" ? "modal" : "card"}
        suggestions={result.recommendations}
        contextNote={result.patternNote}
      />
    </div>
  )
}
