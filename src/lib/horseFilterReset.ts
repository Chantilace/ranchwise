import type { Dispatch, SetStateAction } from "react"

export function createDefaultHorseStatusFilterSet(): Set<"flag" | "monitor" | "good"> {
  return new Set(["flag", "monitor", "good"])
}

export function createDefaultHorseBehaviorStatusFilterSet(): Set<"flag" | "monitor" | "good"> {
  return new Set(["flag", "monitor", "good"])
}

export function createDefaultHorseSexFilterSet(): Set<string> {
  return new Set(["Mare", "Gelding", "Stallion"])
}

export function createDefaultHorsePastureFilterSet(pastureNames: readonly string[]): Set<string> {
  return new Set(pastureNames)
}

export function resetHorseToolbarFilters(args: {
  setSearch: (v: string) => void
  setStatusFilters: Dispatch<SetStateAction<Set<"flag" | "monitor" | "good">>>
  setPastureFilters: Dispatch<SetStateAction<Set<string>>>
  setSexFilters: Dispatch<SetStateAction<Set<string>>>
  pastureNames: readonly string[]
}) {
  args.setSearch("")
  args.setStatusFilters(createDefaultHorseStatusFilterSet())
  args.setPastureFilters(createDefaultHorsePastureFilterSet(args.pastureNames))
  args.setSexFilters(createDefaultHorseSexFilterSet())
}
