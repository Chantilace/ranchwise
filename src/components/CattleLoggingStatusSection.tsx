import { formatDistanceToNow, parseISO } from "date-fns"
import { NotebookPen } from "lucide-react"

import { calvingStatusPill } from "@/components/CattleRosterTable"
import { RichText } from "@/components/RichText"
import { Button } from "@/components/ui/button"
import {
  formatCalfStatusLabel,
  formatComplicationsSummary,
  formatDeliveryTypeLabel,
  getCalvingStatus,
} from "@/lib/calvingStatus"
import { getComplicationVariant } from "@/lib/calvingRichTextVariants"
import { formatCattleTagDisplay } from "@/lib/cattleUi"
import type { Cattle } from "@/types/cattle"
import { cn } from "@/lib/utils"

export type CattleLoggingStatusSectionProps = {
  cattle: Cattle
  pastureName: string
  /** @deprecated Calving is now recorded in the log flow; no longer rendered here. Accepted for caller compatibility. */
  onRecordCalving?: () => void
  /** Required when `showActions` is true. Opens the log flow (where calving events are now recorded). */
  onLogObservation?: () => void
  /** When false, show calving context only (e.g. home sheet result step). */
  showActions?: boolean
  /** Panel detail body uses horizontal padding on each row; home log sheet relies on parent padding. */
  usePanelPadding?: boolean
}

/**
 * Calving status pill, contextual delivery lines, and the Log observation CTA.
 * Calving events (in labor / calved) are recorded inside the log flow, not here.
 */
export function CattleLoggingStatusSection({
  cattle,
  pastureName: _pastureName,
  onLogObservation,
  showActions = true,
  usePanelPadding = true,
}: CattleLoggingStatusSectionProps) {
  const effective = getCalvingStatus(cattle)
  const cattlePageLogLabel = `Log ${formatCattleTagDisplay(cattle.tagNumber)}`
  const cattlePageLogAriaLabel = `Log observation for ${formatCattleTagDisplay(cattle.tagNumber)}`

  const inLaborRelative =
    cattle.calvingStatus === "in-labor" && cattle.inLaborTimestamp
      ? formatDistanceToNow(parseISO(cattle.inLaborTimestamp), { addSuffix: false })
      : null

  const deliveryType = formatDeliveryTypeLabel(cattle.deliveryType)
  const calfStatus = formatCalfStatusLabel(cattle.calfStatus)
  const complicationSummary = formatComplicationsSummary(cattle.calvingComplications)

  const pad = usePanelPadding ? "px-4" : ""
  const padTop = usePanelPadding ? "px-4 pt-4" : ""

  return (
    <>
      <div className={cn("flex flex-wrap items-center gap-2", padTop)}>{calvingStatusPill(cattle)}</div>

      {cattle.calvingStatus === "in-labor" && inLaborRelative ? (
        <p className={cn("pt-2 text-[13px] text-muted-foreground", pad)}>Marked {inLaborRelative} ago</p>
      ) : null}

      {effective === "calved" ? (
        <RichText
          variant={getComplicationVariant(cattle.deliveryType === "assisted" ? "Assisted" : "Normal")}
          className={cn("mt-2 block text-[13px]", pad)}
        >
          {deliveryType} · {calfStatus}
        </RichText>
      ) : null}

      {effective === "complications" ? (
        <RichText variant={getComplicationVariant("Complications")} className={cn("mt-2 block text-[13px]", pad)}>
          {deliveryType} · {complicationSummary}
        </RichText>
      ) : null}

      {showActions && onLogObservation ? (
        <div className={cn("mt-4 flex flex-col gap-2", pad)}>
          <Button
            type="button"
            variant="primary"
            className="w-full gap-1.5"
            aria-label={cattlePageLogAriaLabel}
            onClick={onLogObservation}
          >
            <NotebookPen className="size-4 shrink-0" aria-hidden />
            {cattlePageLogLabel}
          </Button>
        </div>
      ) : null}
    </>
  )
}
