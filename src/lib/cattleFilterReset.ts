import type { Dispatch, SetStateAction } from "react"
import type { CattleCareDueKind } from "@/lib/cattleCareDue"
import { createDefaultCalvingFilterSet, type EffectiveCalvingStatus } from "@/lib/calvingStatus"
import type { Breed } from "@/types/cattle"

export function resetCattleToolbarFilters(args: {
  setSearch: (v: string) => void
  setCalvingFilters: Dispatch<SetStateAction<Set<EffectiveCalvingStatus>>>
  setHealthFilters: Dispatch<SetStateAction<Set<"Flag" | "Monitor" | "Good">>>
  setBreedFilter: (b: "all" | Breed) => void
  setCareDueKind?: (v: CattleCareDueKind | null) => void
}) {
  args.setSearch("")
  args.setCalvingFilters(createDefaultCalvingFilterSet())
  args.setHealthFilters(new Set(["Flag", "Monitor", "Good"]))
  args.setBreedFilter("all")
  args.setCareDueKind?.(null)
}
