import { Baby, Binoculars, HeartPulse, Wheat } from "lucide-react"
import type { LogCategory } from "@/components/RanchWiseHorseRoster"
import type { Category } from "@/types/observation"
import { CATEGORY_METADATA_BADGE_CLASS } from "@/lib/categoryBadgeClass"
import { cn } from "@/lib/utils"

/** Observation log category pill — warm tan tokens; compact geometry matches `StatusBadge` size `sm`. */
const CATEGORY_CONFIG = {
  health: { label: "Health", Icon: HeartPulse },
  feeding: { label: "Feeding", Icon: Wheat },
  behavior: { label: "Behavior", Icon: Binoculars },
  calving: { label: "Calving", Icon: Baby },
} as const

export function ObservationCategoryBadge({
  category,
  showIcon = true,
  variant: _variant = "default",
}: {
  category: LogCategory | Category
  showIcon?: boolean
  /** Kept for API compatibility; timeline and default share the same sizing and tokens. */
  variant?: "default" | "timeline"
}) {
  const key = category.toLowerCase() as keyof typeof CATEGORY_CONFIG
  const cfg = CATEGORY_CONFIG[key]
  if (!cfg) return null
  const { label, Icon } = cfg
  return (
    <span className={cn(CATEGORY_METADATA_BADGE_CLASS, showIcon && "gap-1")}>
      {showIcon ? <Icon className="size-3 shrink-0" aria-hidden /> : null}
      {label}
    </span>
  )
}
