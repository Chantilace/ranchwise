import type { Cattle } from "@/types/cattle"

function isAssignedInHerd(c: Cattle): boolean {
  const s = c.inventoryStatus ?? "active"
  return s !== "deceased" && s !== "sold"
}

function hasPriorCalvingRecord(c: Cattle): boolean {
  if (c.calvingDate?.trim()) return true
  if (c.calvingStatus === "calved") return true
  if (c.calvingStatus === "complications") return true
  return false
}

/** Buckets for the pasture card herd composition line (spec: sex + parity). */
export type PastureHerdBucket = "heifer" | "cow" | "bull"

/**
 * Classify one animal for pasture herd counts.
 * Primary: `sexLabel` (Heifer / Cow / Bull). Fallback when missing: parity from calving records + age.
 */
export function classifyPastureHerdMember(c: Cattle): PastureHerdBucket | null {
  const sex = c.sexLabel?.trim().toLowerCase()
  if (sex === "bull") return "bull"
  if (sex === "heifer") return "heifer"
  if (sex === "cow") return "cow"
  // Legacy / unlabeled — infer female cattle only; unknown sex excluded from h·c·b line
  if (sex === "steer" || sex === "calf") return null
  if (hasPriorCalvingRecord(c)) return "cow"
  if (c.age <= 2) return "heifer"
  if (c.calvingStatus === "pregnant" || c.calvingStatus === "in-labor") return "cow"
  return null
}

export function countPastureHerdComposition(
  cattle: Cattle[],
  pastureId: string
): { heiferCount: number; cowCount: number; bullCount: number } {
  let heiferCount = 0
  let cowCount = 0
  let bullCount = 0
  for (const c of cattle) {
    if (c.pastureId !== pastureId || !isAssignedInHerd(c)) continue
    const b = classifyPastureHerdMember(c)
    if (b === "heifer") heiferCount++
    else if (b === "cow") cowCount++
    else if (b === "bull") bullCount++
  }
  return { heiferCount, cowCount, bullCount }
}

export function getPastureSuggestion(heiferCount: number, cowCount: number): string {
  if (cowCount === 0) {
    return "All first-timers — check more frequently than experienced pastures."
  }
  if (heiferCount === 1) {
    return "1 heifer in this group — give her extra attention as she approaches her due date."
  }
  return `${heiferCount} heifers in this group — give them extra attention as they approach their due dates.`
}
