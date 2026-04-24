import { getCalvingStatus } from "@/lib/calvingStatus"
import type { Cattle, Pasture } from "@/types/cattle"

/** Pasture with the strongest calving / due signal — matches Season card “active” pasture. */
export function getMostActiveCalvingPasture(
  cattle: Cattle[],
  pastures: Pasture[]
): { id: string; name: string } {
  if (pastures.length === 0) return { id: "east", name: "East Pasture" }
  const scores = new Map<string, number>()
  for (const c of cattle) {
    const st = getCalvingStatus(c)
    let pts = 0
    if (st === "calving-soon") pts += 5
    else if (st === "pregnant" || st === "in-labor") pts += 1
    scores.set(c.pastureId, (scores.get(c.pastureId) ?? 0) + pts)
  }
  let best: Pasture = pastures[0]!
  let bestScore = -1
  for (const p of pastures) {
    const s = scores.get(p.id) ?? 0
    if (s > bestScore) {
      bestScore = s
      best = p
    }
  }
  if (bestScore <= 0) {
    const east = pastures.find((p) => p.id === "east")
    if (east) return { id: east.id, name: east.name }
  }
  return { id: best.id, name: best.name }
}
