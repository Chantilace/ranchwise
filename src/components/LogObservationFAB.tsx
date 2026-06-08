import { NotebookPen } from "lucide-react"
import { useCallback } from "react"
import { useMatch } from "react-router-dom"
import { horseRowKey } from "@/components/RanchWiseHorseRoster"
import { useLogObservation } from "@/contexts/LogObservationContext"
import { useOverlayRegistry } from "@/contexts/OverlayRegistryContext"
import { useRanchData } from "@/contexts/RanchDataContext"
import { cn } from "@/lib/utils"

type LogObservationFABProps = {
  className?: string
}

/**
 * Mobile-only FAB: opens the unified Log observation sheet, or (when on an entity route)
 * the same log targets as header actions via {@link RanchDataContext}.
 */
export function LogObservationFAB({ className }: LogObservationFABProps) {
  const { open: openUnifiedSheet } = useLogObservation()
  const { hasOpenOverlay } = useOverlayRegistry()
  const { herdRows, cattle, pastures, openLogModal, openCattleLogModal, openPastureCheckModal } =
    useRanchData()

  const horseProfileMatch = useMatch({ path: "/horses/:horseId", end: true })
  const cattleAnimalMatch = useMatch({ path: "/cattle/animal/:cattleId", end: true })
  const pastureThenAnimalMatch = useMatch({ path: "/pastures/:pastureId/:cattleId", end: true })
  const pastureProfileMatch = useMatch({ path: "/pastures/:pastureId", end: true })

  const handleClick = useCallback(() => {
    if (horseProfileMatch?.params.horseId) {
      const key = decodeURIComponent(horseProfileMatch.params.horseId)
      const row = herdRows.find((h) => horseRowKey(h) === key)
      if (row) {
        openLogModal(row)
        return
      }
    }

    if (cattleAnimalMatch?.params.cattleId) {
      const id = decodeURIComponent(cattleAnimalMatch.params.cattleId)
      const found = cattle.find((c) => c.id === id)
      if (found) {
        openCattleLogModal(found)
        return
      }
    }

    if (pastureThenAnimalMatch?.params.cattleId && pastureThenAnimalMatch.params.pastureId) {
      const segment = decodeURIComponent(pastureThenAnimalMatch.params.cattleId)
      if (segment !== "roster") {
        const found = cattle.find((c) => c.id === segment)
        if (found) {
          openCattleLogModal(found)
          return
        }
      }
    }

    if (pastureProfileMatch?.params.pastureId) {
      const pid = decodeURIComponent(pastureProfileMatch.params.pastureId)
      const pasture = pastures.find((p) => p.id === pid)
      if (pasture) {
        openPastureCheckModal({ pastureId: pasture.id, pastureName: pasture.name })
        return
      }
    }

    openUnifiedSheet()
  }, [
    cattle,
    cattleAnimalMatch?.params.cattleId,
    herdRows,
    horseProfileMatch?.params.horseId,
    openCattleLogModal,
    openLogModal,
    openPastureCheckModal,
    openUnifiedSheet,
    pastureProfileMatch?.params.pastureId,
    pastureThenAnimalMatch?.params.cattleId,
    pastureThenAnimalMatch?.params.pastureId,
    pastures,
  ])

  if (hasOpenOverlay) return null

  return (
    <div
      className={cn(
        "fixed bottom-[calc(24px+env(safe-area-inset-bottom,0px))] right-[calc(24px+env(safe-area-inset-right,0px))] z-[60] md:hidden",
        "motion-safe:animate-[fab-pop-in_320ms_cubic-bezier(0.34,1.56,0.64,1)_both]",
        className,
      )}
    >
      <button
        type="button"
        onClick={handleClick}
        className={cn(
          "group relative flex size-14 shrink-0 items-center justify-center rounded-full",
          "bg-action text-action-foreground shadow-[0_8px_20px_rgba(91,76,174,0.45),0_2px_6px_rgba(91,76,174,0.3)] transition-all",
          "hover:bg-action-hover active:scale-90 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring/50",
        )}
        aria-label="Log observation"
      >
        {/* Idle attention ring (sits behind the icon; box-shadow ripples outside the button).
            Pulses 3x on mount, then rests so it doesn't read as busy during long sessions. */}
        <span
          aria-hidden
          className="pointer-events-none absolute inset-0 rounded-full motion-safe:animate-[fab-pulse-ring_2.4s_ease-out_3]"
        />
        <NotebookPen
          className="relative size-6 shrink-0 text-action-foreground transition-[rotate,translate] duration-200 ease-[cubic-bezier(0.34,1.56,0.64,1)] group-active:-translate-y-0.5 group-active:-rotate-[10deg]"
          aria-hidden
        />
      </button>
    </div>
  )
}
