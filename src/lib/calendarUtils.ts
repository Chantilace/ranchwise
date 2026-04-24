import { differenceInCalendarDays, startOfDay } from "date-fns"

export type RanchSeason = {
  id: string
  label: string
  /** MM-DD */
  start: string
  /** MM-DD */
  end: string
}

/** Human-readable span under each season on the bar (v1). */
export const SEASON_BAR_SPAN: Record<string, string> = {
  winter: "Nov – Jan",
  calving: "Feb – Apr",
  branding: "May",
  turnout: "Jun – Aug",
  gathering: "Sept – Oct",
}

/** Display order left-to-right on the season bar. */
export const RANCH_SEASONS: RanchSeason[] = [
  { id: "winter", label: "Winter feeding", start: "11-01", end: "01-31" },
  { id: "calving", label: "Calving", start: "02-01", end: "04-30" },
  { id: "branding", label: "Branding", start: "05-01", end: "05-31" },
  { id: "turnout", label: "Turnout", start: "06-01", end: "08-31" },
  { id: "gathering", label: "Gathering", start: "09-01", end: "10-31" },
]

/** First day of the ranch year (Nov 1) that contains `ref`. */
export function ranchYearStart(ref: Date = new Date()): Date {
  const y = ref.getFullYear()
  const m = ref.getMonth()
  if (m >= 10) return new Date(y, 10, 1)
  return new Date(y - 1, 10, 1)
}

function parseMmDdInYear(mmdd: string, year: number): Date {
  const [mo, da] = mmdd.split("-").map(Number)
  return new Date(year, mo - 1, da)
}

/** Absolute calendar bounds for a season within the ranch year that contains `ref`. */
export function getSeasonRangeInRanchYear(season: RanchSeason, ref: Date = new Date()): { start: Date; end: Date } {
  const rs = ranchYearStart(ref)
  const y0 = rs.getFullYear()

  if (season.id === "winter") {
    return {
      start: rs,
      end: new Date(y0 + 1, 0, 31),
    }
  }

  const y1 = y0 + 1
  const starts = parseMmDdInYear(season.start, y1)
  const ends = parseMmDdInYear(season.end, y1)
  return { start: starts, end: ends }
}

export function getCurrentSeason(now: Date = new Date()): RanchSeason {
  const m = now.getMonth() + 1
  if (m === 11 || m === 12 || m === 1) {
    return RANCH_SEASONS.find((s) => s.id === "winter")!
  }
  if (m >= 2 && m <= 4) {
    return RANCH_SEASONS.find((s) => s.id === "calving")!
  }
  if (m === 5) return RANCH_SEASONS.find((s) => s.id === "branding")!
  if (m >= 6 && m <= 8) return RANCH_SEASONS.find((s) => s.id === "turnout")!
  if (m >= 9 && m <= 10) return RANCH_SEASONS.find((s) => s.id === "gathering")!
  return RANCH_SEASONS.find((s) => s.id === "winter")!
}

export type SeasonBarPhase = "past" | "current" | "future"

export function getSeasonBarPhase(season: RanchSeason, now: Date = new Date()): SeasonBarPhase {
  const current = getCurrentSeason(now)
  if (season.id === current.id) return "current"
  const { start, end } = getSeasonRangeInRanchYear(season, now)
  const t = startOfDay(now).getTime()
  if (end.getTime() < t) return "past"
  if (start.getTime() > t) return "future"
  return "current"
}

/** Inclusive calendar days from today through season end (0 if last day is today). */
export function daysRemainingInSeason(season: RanchSeason, now: Date = new Date()): number {
  const { end } = getSeasonRangeInRanchYear(season, now)
  return Math.max(0, differenceInCalendarDays(startOfDay(end), startOfDay(now)))
}

function formatRangeShort(start: Date, end: Date): string {
  const mo = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"]
  const a = `${mo[start.getMonth()]} ${start.getDate()}`
  const b = `${mo[end.getMonth()]} ${end.getDate()}`
  return `${a} – ${b}`
}

export function seasonDateRangeLabel(season: RanchSeason, ref: Date = new Date()): string {
  const { start, end } = getSeasonRangeInRanchYear(season, ref)
  return formatRangeShort(start, end)
}

/** Next `count` seasons after the current one in ranch-year order (wraps). */
export function getUpcomingSeasons(count: number, now: Date = new Date()): RanchSeason[] {
  const current = getCurrentSeason(now)
  const idx = RANCH_SEASONS.findIndex((s) => s.id === current.id)
  const out: RanchSeason[] = []
  for (let k = 1; k <= count; k++) {
    out.push(RANCH_SEASONS[(idx + k) % RANCH_SEASONS.length]!)
  }
  return out
}

/** Days until the start of `season`’s next occurrence on or after `now` (calendar day). */
export function daysUntilSeasonStart(season: RanchSeason, now: Date = new Date()): number {
  let ref: Date = now
  for (let i = 0; i < 4; i++) {
    const { start } = getSeasonRangeInRanchYear(season, ref)
    if (startOfDay(start) >= startOfDay(now)) {
      return differenceInCalendarDays(startOfDay(start), startOfDay(now))
    }
    const ry = ranchYearStart(ref)
    ref = new Date(ry.getFullYear() + 1, ry.getMonth(), ry.getDate())
  }
  return 0
}
