import { Baby, Binoculars, HeartPulse, Wheat } from "lucide-react"
import type { LogCategory } from "@/components/HeguyRanchCoPilot"
import type { Category } from "@/types/observation"
import { cn } from "@/lib/utils"

/** Observation log category pill — Ranch Co-Pilot Figma (Observation Log Category / 40:1197). */
const CATEGORY_CONFIG = {
  health: { label: "Health", Icon: HeartPulse },
  feeding: { label: "Feeding", Icon: Wheat },
  behavior: { label: "Behavior", Icon: Binoculars },
  calving: { label: "Calving", Icon: Baby },
} as const

const defaultPillClass =
  "inline-flex items-center gap-1 rounded-lg bg-neutral-100 px-2 py-0.5 text-xs font-normal text-foreground [&_svg]:text-foreground"

/** Softer treatment next to the date line in observation rows. */
const mutedPillClass =
  "inline-flex items-center gap-1 rounded-lg border-[0.5px] border-border/60 bg-muted px-2 py-0.5 text-xs font-normal text-muted-foreground [&_svg]:text-muted-foreground"

export function ObservationCategoryBadge({ category }: { category: LogCategory | Category }) {
  const key = category.toLowerCase() as keyof typeof CATEGORY_CONFIG
  const cfg = CATEGORY_CONFIG[key]
  if (!cfg) return null
  const { label, Icon } = cfg
  const muted = key === "health" || key === "behavior"
  return (
    <span className={cn(muted ? mutedPillClass : defaultPillClass)}>
      <Icon className="size-3 shrink-0" aria-hidden />
      {label}
    </span>
  )
}
