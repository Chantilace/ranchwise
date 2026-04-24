import { formatDistanceToNow, parseISO } from "date-fns"

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
import { useRanchData } from "@/contexts/RanchDataContext"
import type { Cattle } from "@/types/cattle"
import { cn } from "@/lib/utils"

export type CattleLoggingStatusSectionProps = {
  cattle: Cattle
  pastureName: string
  /** Required when `showActions` is true. */
  onRecordCalving?: () => void
  onLogObservation?: () => void
  /** When false, show calving context only (e.g. home sheet result step). */
  showActions?: boolean
  /** Panel detail body uses horizontal padding on each row; home log sheet relies on parent padding. */
  usePanelPadding?: boolean
}

/**
 * Calving status pill, contextual delivery lines, and the same CTAs as the cattle detail panel
 * (Record calving / Log observation / Mark as in labor by state).
 */
export function CattleLoggingStatusSection({
  cattle,
  pastureName,
  onRecordCalving,
  onLogObservation,
  showActions = true,
  usePanelPadding = true,
}: CattleLoggingStatusSectionProps) {
  const { markCattleInLabor } = useRanchData()
  const effective = getCalvingStatus(cattle)

  const inLaborRelative =
    cattle.calvingStatus === "in-labor" && cattle.inLaborTimestamp
      ? formatDistanceToNow(parseISO(cattle.inLaborTimestamp), { addSuffix: false })
      : null

  const showMarkInLabor = effective === "calving-soon"

  const deliveryType = formatDeliveryTypeLabel(cattle.deliveryType)
  const calfStatus = formatCalfStatusLabel(cattle.calfStatus)
  const complicationSummary = formatComplicationsSummary(cattle.calvingComplications)

  const preCalvingOrLabor =
    effective === "pregnant" || effective === "calving-soon" || effective === "in-labor"

  const pad = usePanelPadding ? "px-4" : ""
  const padTop = usePanelPadding ? "px-4 pt-4" : ""

  return (
    <>
      <div className={cn("flex flex-wrap items-center gap-2", padTop)}>{calvingStatusPill(cattle)}</div>

      {cattle.calvingStatus === "in-labor" && inLaborRelative ? (
        <p className={cn("pt-2 text-xs text-muted-foreground", pad)}>Marked {inLaborRelative} ago</p>
      ) : null}

      {effective === "calved" ? (
        <RichText
          variant={getComplicationVariant(cattle.deliveryType === "assisted" ? "Assisted" : "Normal")}
          className={cn("mt-2 block text-xs", pad)}
        >
          {deliveryType} · {calfStatus}
        </RichText>
      ) : null}

      {effective === "complications" ? (
        <RichText variant={getComplicationVariant("Complications")} className={cn("mt-2 block text-xs", pad)}>
          {deliveryType} · {complicationSummary}
        </RichText>
      ) : null}

      {showActions && onRecordCalving && onLogObservation ? (
        <div className={cn("mt-4 flex flex-col gap-2", pad)}>
          {preCalvingOrLabor ? (
            <>
              <Button type="button" variant="primary" className="w-full" onClick={onRecordCalving}>
                Record calving
              </Button>
              <Button type="button" variant="tertiary" className="w-full" onClick={onLogObservation}>
                Log observation
              </Button>
              {showMarkInLabor ? (
                <button
                  type="button"
                  className="block w-full cursor-pointer border-none bg-transparent py-1 text-center text-sm text-action outline-none hover:underline focus-visible:ring-2 focus-visible:ring-ring/40"
                  onClick={() => markCattleInLabor(cattle.id)}
                >
                  Mark as in labor
                </button>
              ) : null}
            </>
          ) : null}

          {effective === "calved" ? (
            <Button type="button" variant="primary" className="w-full" onClick={onLogObservation}>
              Log observation
            </Button>
          ) : null}

          {effective === "complications" ? (
            <>
              <Button type="button" variant="primary" className="w-full" onClick={onRecordCalving}>
                Record calving outcome
              </Button>
              <Button type="button" variant="tertiary" className="w-full" onClick={onLogObservation}>
                Log observation
              </Button>
            </>
          ) : null}
          {effective === "none" ? (
            <Button type="button" variant="primary" className="w-full" onClick={onLogObservation}>
              Log observation
            </Button>
          ) : null}
        </div>
      ) : null}
    </>
  )
}
