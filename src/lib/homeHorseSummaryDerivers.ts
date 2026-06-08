import { startOfDay, subDays } from "date-fns"
import { horseRowKey, type HorseTableRow } from "@/components/RanchWiseHorseRoster"
import { getObservationDomain } from "@/lib/observationDomain"
import { parseObservationDate } from "@/lib/initialObservations"
import type { ObservationEntry, RiskLevel } from "@/types/observation"

export const HORSE_HOME_EVIDENCE_MAX_CHARS = 90
export const HORSE_HOME_AI_SUMMARY_TARGET = 68

/** Truncate for evidence line after author prefix (word boundary + ellipsis). */
export function truncateEvidenceNote(text: string, max = HORSE_HOME_EVIDENCE_MAX_CHARS): string {
  const t = text.trim()
  if (t.length <= max) return t
  const truncated = t.slice(0, max)
  const lastSpace = truncated.lastIndexOf(" ")
  return `${truncated.slice(0, lastSpace > 0 ? lastSpace : max).trimEnd()}…`
}

function truncateSummaryWords(text: string, max = HORSE_HOME_AI_SUMMARY_TARGET): string {
  const t = text.replace(/\s+/g, " ").trim()
  if (t.length <= max) return t
  const cut = t.slice(0, max)
  const lastSpace = cut.lastIndexOf(" ")
  return (lastSpace > 28 ? cut.slice(0, lastSpace) : cut).trimEnd() + "…"
}

export function isHorseObservationThisWeek(entry: ObservationEntry, now = new Date()): boolean {
  const t = parseObservationDate(entry.date)
  if (!Number.isFinite(t) || t <= 0) return false
  const cutoff = startOfDay(subDays(now, 7)).getTime()
  return t >= cutoff
}

export function compareAttentionObservations(
  a: ObservationEntry,
  b: ObservationEntry,
  dateA: number,
  dateB: number
): number {
  const tier = (r: RiskLevel | null | undefined) => (r === "flag" ? 0 : r === "monitor" ? 1 : 2)
  const ta = tier(a.aiResult?.riskLevel)
  const tb = tier(b.aiResult?.riskLevel)
  if (ta !== tb) return ta - tb
  return dateB - dateA
}

/** One-line AI-style read for watchlist (deterministic; prefers pattern note / recommendations). */
export function deriveHorseAttentionSummaryLine(entry: ObservationEntry): string {
  const risk = entry.aiResult?.riskLevel ?? "good"
  const domain = getObservationDomain(entry)
  const pattern = entry.aiResult?.patternNote?.trim()
  if (pattern) return truncateSummaryWords(pattern)

  const firstRec = entry.aiResult?.recommendations?.find((s) => s.trim())?.trim()
  if (firstRec) return truncateSummaryWords(firstRec)

  if (risk === "flag") {
    if (domain === "behavior") return "Behavior flagged urgent — vet follow-up recommended."
    return "Health concern flagged for vet follow-up."
  }
  if (risk === "monitor") {
    if (domain === "behavior") return "Behavior on watch — keep sessions short and documented."
    return "Health on watch — recheck appetite and vitals this week."
  }
  return "Observation logged — review details on profile."
}

export type HorseWeeklyAttentionPick = {
  horse: HorseTableRow
  entry: ObservationEntry
  entryTime: number
}

/**
 * Latest `limit` horse observations in the rolling 7-day window, newest first.
 * Includes any category and any AI risk (not limited to watchlist).
 */
export function buildHorseRecentObservationPicks(
  herdRows: readonly HorseTableRow[],
  observationsByHorse: Record<string, ObservationEntry[]>,
  now = new Date(),
  limit = 3
): HorseWeeklyAttentionPick[] {
  type Flat = { horse: HorseTableRow; entry: ObservationEntry; t: number }
  const flat: Flat[] = []
  for (const horse of herdRows) {
    const key = horseRowKey(horse)
    for (const entry of observationsByHorse[key] ?? []) {
      if (!isHorseObservationThisWeek(entry, now)) continue
      // Prefer the precise creation time so a freshly-logged entry sorts above same-day seed
      // entries (whose `date` only resolves to midnight); fall back to the day timestamp.
      const t = entry.createdAtMs ?? parseObservationDate(entry.date)
      if (!Number.isFinite(t) || t <= 0) continue
      flat.push({ horse, entry, t })
    }
  }
  flat.sort((a, b) => b.t - a.t)
  return flat.slice(0, limit).map(({ horse, entry, t }) => ({ horse, entry, entryTime: t }))
}

/** Count of horse observations in the rolling 7-day window (all horses). */
export function countHorseObservationsLast7Days(
  herdRows: readonly HorseTableRow[],
  observationsByHorse: Record<string, ObservationEntry[]>,
  now = new Date(),
): number {
  let n = 0
  for (const horse of herdRows) {
    const key = horseRowKey(horse)
    for (const entry of observationsByHorse[key] ?? []) {
      if (isHorseObservationThisWeek(entry, now)) n += 1
    }
  }
  return n
}

export type HorseHerdPulseMetrics = {
  watchHorseCount: number
  acuteHorseCount: number
  monitorOnlyHorseCount: number
  healthWatchCount: number
  behaviorWatchCount: number
  acuteObsLast3Days: number
  /** Matches roster column + `/horses?healthStatus=flag` (worst AI across health observations). */
  rosterHealthFlagCount: number
  /** Matches `/horses?behaviorStatus=flag`. */
  rosterBehaviorFlagCount: number
}

function isActionableHorseRisk(risk: RiskLevel | null | undefined): boolean {
  return risk === "flag" || risk === "monitor"
}

export type HorseHomeWeeklyRollup = {
  dedupedAttention: HorseWeeklyAttentionPick[]
  weeklyAttentionTotalHorses: number
  pulseMetrics: HorseHerdPulseMetrics
}

/** Deduped weekly watchlist + pulse metrics (shared by homepage AI row and horse summary card). */
export function buildHorseHomeWeeklyRollup(
  herdRows: readonly HorseTableRow[],
  observationsByHorse: Record<string, ObservationEntry[]>,
  now = new Date()
): HorseHomeWeeklyRollup {
  type FlatPick = { horse: HorseTableRow; entry: ObservationEntry; t: number }
  const actionableFlat: FlatPick[] = []

  const threeStart = startOfDay(subDays(now, 3)).getTime()

  for (const horse of herdRows) {
    const key = horseRowKey(horse)
    const entries = observationsByHorse[key] ?? []
    for (const entry of entries) {
      if (!isHorseObservationThisWeek(entry, now)) continue
      const t = parseObservationDate(entry.date)
      if (!isActionableHorseRisk(entry.aiResult?.riskLevel)) continue
      actionableFlat.push({ horse, entry, t })
    }
  }

  actionableFlat.sort((a, b) => compareAttentionObservations(a.entry, b.entry, a.t, b.t))

  const seenHorse = new Set<string>()
  const dedupedAttention: HorseWeeklyAttentionPick[] = []
  for (const row of actionableFlat) {
    const k = horseRowKey(row.horse)
    if (seenHorse.has(k)) continue
    seenHorse.add(k)
    dedupedAttention.push({ horse: row.horse, entry: row.entry, entryTime: row.t })
  }

  const acuteHorseKeys = new Set<string>()
  for (const row of actionableFlat) {
    if (row.entry.aiResult?.riskLevel === "flag") {
      acuteHorseKeys.add(horseRowKey(row.horse))
    }
  }

  let acuteObsLast3Days = 0
  for (const row of actionableFlat) {
    if (row.entry.aiResult?.riskLevel !== "flag") continue
    if (row.t >= threeStart) acuteObsLast3Days += 1
  }

  let healthWatchCount = 0
  let behaviorWatchCount = 0
  for (const pick of dedupedAttention) {
    const d = getObservationDomain(pick.entry)
    if (d === "health") healthWatchCount += 1
    else if (d === "behavior") behaviorWatchCount += 1
  }

  const watchHorseCount = dedupedAttention.length
  const acuteHorseCount = acuteHorseKeys.size
  const monitorOnlyHorseCount = Math.max(0, watchHorseCount - acuteHorseCount)

  const rosterHealthFlagCount = herdRows.filter((h) => h.healthStatus === "flag").length
  const rosterBehaviorFlagCount = herdRows.filter((h) => h.behaviorStatus === "flag").length

  const pulseMetrics: HorseHerdPulseMetrics = {
    watchHorseCount,
    acuteHorseCount,
    monitorOnlyHorseCount,
    healthWatchCount,
    behaviorWatchCount,
    acuteObsLast3Days,
    rosterHealthFlagCount,
    rosterBehaviorFlagCount,
  }

  return {
    dedupedAttention,
    weeklyAttentionTotalHorses: watchHorseCount,
    pulseMetrics,
  }
}

/**
 * Editorial pulse copy derived from counts (no LLM).
 * `leadBold` is plain text shown inside <strong>; `body` follows in normal weight.
 */
export function buildHorseHerdPulseParts(
  metrics: HorseHerdPulseMetrics,
  opts?: { quiet?: boolean }
): { leadBold: string; body: string } {
  if (opts?.quiet || metrics.watchHorseCount === 0) {
    return {
      leadBold: "Quiet week — all horses logged steady.",
      body: "",
    }
  }

  const n = metrics.watchHorseCount
  const leadBold = `This week — ${n} ${n === 1 ? "horse" : "horses"} on watch.`

  const parts: string[] = []

  if (metrics.rosterHealthFlagCount > 0) {
    if (metrics.acuteHorseCount > 0 && metrics.rosterHealthFlagCount !== metrics.acuteHorseCount) {
      parts.push(
        `${metrics.rosterHealthFlagCount} horse${metrics.rosterHealthFlagCount === 1 ? "" : "s"} show health-flag on the roster; ${metrics.acuteHorseCount} acute AI health note${metrics.acuteHorseCount === 1 ? "" : "s"} in the last 7 days.`,
      )
    } else {
      parts.push(
        `${metrics.rosterHealthFlagCount} horse${metrics.rosterHealthFlagCount === 1 ? "" : "s"} ${metrics.rosterHealthFlagCount === 1 ? "needs" : "need"} health follow-up on the roster (vet / acute cases).`,
      )
    }
  } else if (metrics.acuteHorseCount > 0) {
    parts.push(
      `${metrics.acuteHorseCount} acute ${metrics.acuteHorseCount === 1 ? "case" : "cases"} in the last 7 days flagged for vet follow-up.`,
    )
  }

  if (metrics.acuteObsLast3Days > 0) {
    parts.push("Recent acute entries should stay on the day-board until cleared.")
  }

  if (metrics.monitorOnlyHorseCount > 0) {
    if (metrics.acuteHorseCount === 0) {
      parts.push(
        `${metrics.monitorOnlyHorseCount} ${metrics.monitorOnlyHorseCount === 1 ? "is" : "are"} on routine monitor with field notes.`
      )
    } else {
      parts.push(
        `${metrics.monitorOnlyHorseCount} more ${metrics.monitorOnlyHorseCount === 1 ? "horse" : "horses"} on monitor without an acute flag this week.`
      )
    }
  }

  if (metrics.healthWatchCount > metrics.behaviorWatchCount && metrics.healthWatchCount > 0) {
    parts.push("Health observations are driving most of the watch volume.")
  } else if (metrics.behaviorWatchCount > metrics.healthWatchCount && metrics.behaviorWatchCount > 0) {
    parts.push("Behavior episodes are the dominant theme in this week's watchlist.")
  }

  let body = parts.join(" ").trim()
  if (!body) {
    body = "Review watchlist items and close the loop on field follow-ups."
  }

  return { leadBold, body }
}

export type HorseWeeklyAuthorRollup = {
  /** Comma-separated names, max `maxNames`, most frequent first */
  namesDisplay: string
  /** Number of authors not listed in namesDisplay */
  othersCount: number
}

export function rollupHorseWeeklyAuthors(
  entries: readonly ObservationEntry[],
  maxNames = 5
): HorseWeeklyAuthorRollup {
  const counts = new Map<string, number>()
  for (const e of entries) {
    const name = e.loggedBy?.trim()
    if (!name) continue
    counts.set(name, (counts.get(name) ?? 0) + 1)
  }
  const sorted = [...counts.entries()].sort((a, b) => {
    if (b[1] !== a[1]) return b[1] - a[1]
    return a[0].localeCompare(b[0], undefined, { sensitivity: "base" })
  })
  if (sorted.length === 0) return { namesDisplay: "", othersCount: 0 }
  const head = sorted.slice(0, maxNames).map(([n]) => n)
  const othersCount = Math.max(0, sorted.length - maxNames)
  return { namesDisplay: head.join(", "), othersCount }
}
