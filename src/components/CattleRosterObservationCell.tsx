import { ObservationTableActionsCell } from "@/components/ObservationTableActionsCell"
import { useRanchData } from "@/contexts/RanchDataContext"
import type { Cattle } from "@/types/cattle"
import type { ObservationEntry } from "@/types/observation"

export function CattleRosterObservationCell({
  row,
  onOpenObservationLog,
}: {
  row: Cattle
  /** Prefer panel/sheet log flow (herd & pasture rosters). */
  onOpenObservationLog?: (row: Cattle, initialObservation: ObservationEntry | null) => void
}) {
  const { openCattleLogModal } = useRanchData()

  return (
    <ObservationTableActionsCell
      onAddClick={(e) => {
        e.stopPropagation()
        if (onOpenObservationLog) onOpenObservationLog(row, null)
        else openCattleLogModal(row)
      }}
    />
  )
}
