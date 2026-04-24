import type { Cattle } from "@/types/cattle"

/** Bulls / steers do not receive pregnancy checks — roster shows em dash. */
export function isCattlePregnancyCheckNA(c: Pick<Cattle, "sexLabel">): boolean {
  const s = (c.sexLabel ?? "").trim().toLowerCase()
  if (s.includes("steer")) return true
  if (s.includes("heifer")) return false
  if (s.includes("cow")) return false
  if (s.includes("bull")) return true
  return false
}
