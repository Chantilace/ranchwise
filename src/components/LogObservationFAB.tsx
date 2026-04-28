import { NotebookPen } from "lucide-react"
import { useCallback } from "react"
import { useMatch } from "react-router-dom"
import { horseRowKey } from "@/components/RanchWiseHorseRoster"
import { useLogObservation } from "@/contexts/LogObservationContext"
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

  return (
    <button
      type="button"
      onClick={handleClick}
      className={cn(
        "fixed right-6 z-[60] md:hidden",
        "flex size-14 shrink-0 items-center justify-center rounded-full",
        "bg-ai-accent text-white shadow-[0_8px_24px_rgba(123,111,222,0.4)] transition-all",
        "hover:bg-ai-accent-deep focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ai-accent/35",
        className,
      )}
      style={{
        bottom: "max(24px, calc(env(safe-area-inset-bottom, 0px) + 16px))",
      }}
      aria-label="Log observation"
    >
      <NotebookPen className="size-6 shrink-0 text-white" aria-hidden />
    </button>
  )
}
