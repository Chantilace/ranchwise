import { parseISO } from "date-fns"
import { parseObservationDate } from "@/lib/initialObservations"
import type { Pasture } from "@/types/cattle"
import type { ObservationEntry } from "@/types/observation"

export const ROSTER_LAST_ACTIVITY_URL_KEY = "lastActivity"

export const ROSTER_LAST_ACTIVITY_SORT_OPTIONS: { value: "desc" | "asc"; label: string }[] = [
  { value: "desc", label: "Newest first" },
  { value: "asc", label: "Oldest first" },
]

/** URL uses `newest` / `oldest`; internal sort uses observation-style `desc` / `asc`. */
export function rosterLastActivityFromSearchParam(raw: string | null): "desc" | "asc" {
  if (raw === "oldest") return "asc"
  return "desc"
}

export function rosterLastActivityToSearchParam(dir: "desc" | "asc"): string | null {
  return dir === "asc" ? "oldest" : null
}

/**
 * Comparator for “last meaningful activity” timestamps (ms).
 * Newest first (`desc`): nulls sink to bottom. Oldest first (`asc`): nulls float to top.
 */
export function compareRosterLastActivityMs(
  aMs: number | null,
  bMs: number | null,
  dir: "desc" | "asc",
): number {
  if (aMs == null && bMs == null) return 0
  if (aMs == null) return dir === "desc" ? 1 : -1
  if (bMs == null) return dir === "desc" ? -1 : 1
  return dir === "desc" ? bMs - aMs : aMs - bMs
}

export function maxObservationListTimeMs(entries: readonly ObservationEntry[] | undefined): number | null {
  if (!entries?.length) return null
  let max = 0
  for (const e of entries) {
    const t = parseObservationDate(e.date)
    if (Number.isFinite(t) && t > max) max = t
  }
  return max > 0 ? max : null
}

/** Stable key for horse roster rows (matches `horseRowKey` in RanchWiseHorseRoster). */
export function horseObservationMapKey(row: { id?: number | string; name: string }): string {
  return String(row.id ?? row.name)
}

export function getHorseLastObservationTimeMs(
  row: { id?: number | string; name: string },
  observationsByHorse: Record<string, ObservationEntry[]>,
): number | null {
  return maxObservationListTimeMs(observationsByHorse[horseObservationMapKey(row)])
}

export function pastureLastCheckTimeMs(p: Pasture): number | null {
  const raw = p.lastCheckDate?.trim()
  if (!raw) return null
  const t = parseISO(raw)
  const ms = t.getTime()
  return Number.isFinite(ms) ? ms : null
}

/** Stable secondary sort for roster rows that tie on last observation. */
export function sortHorseRowsByLastObservation<T extends { id?: number | string; name: string }>(
  rows: readonly T[],
  dir: "desc" | "asc",
  observationsByHorse: Record<string, ObservationEntry[]>,
): T[] {
  return [...rows].sort((a, b) => {
    const p = compareRosterLastActivityMs(
      getHorseLastObservationTimeMs(a, observationsByHorse),
      getHorseLastObservationTimeMs(b, observationsByHorse),
      dir,
    )
    if (p !== 0) return p
    return a.name.localeCompare(b.name, undefined, { sensitivity: "base" })
  })
}
