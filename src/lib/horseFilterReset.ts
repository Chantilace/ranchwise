import type { Dispatch, SetStateAction } from "react"

export function resetHorseToolbarFilters(args: {
  setSearch: (v: string) => void
  setStatusFilters: Dispatch<SetStateAction<Set<"flag" | "monitor" | "good">>>
  setBehaviorStatusFilters: Dispatch<SetStateAction<Set<"flag" | "monitor" | "good">>>
  setRoleFilters: Dispatch<SetStateAction<Set<string>>>
  setCorralFilters: Dispatch<SetStateAction<Set<string>>>
}) {
  args.setSearch("")
  args.setStatusFilters(new Set())
  args.setBehaviorStatusFilters(new Set())
  args.setRoleFilters(new Set())
  args.setCorralFilters(new Set())
}
