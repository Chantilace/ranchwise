import { differenceInDays, parseISO } from "date-fns"

import { horseRowKey, type HorseTableRow } from "@/components/HeguyRanchCoPilot"

export const FARRIER_INTERVAL_DAYS = 84
export const DENTAL_INTERVAL_DAYS = 365
export const DUE_SOON_WINDOW_DAYS = 7

export type CareStatus = "overdue" | "due_soon" | "ok" | "unknown"

export type CareStatusResult = {
  status: CareStatus
  daysSince: number
  daysUntilDue: number
}

function careStatusFromLastDate(
  lastIso: string | null | undefined,
  interval: number,
  today: Date
): CareStatusResult {
  const trimmed = lastIso?.trim()
  if (!trimmed) {
    return { status: "unknown", daysSince: 0, daysUntilDue: 0 }
  }
  let last: Date
  try {
    last = parseISO(trimmed)
    if (Number.isNaN(last.getTime())) {
      return { status: "unknown", daysSince: 0, daysUntilDue: 0 }
    }
  } catch {
    return { status: "unknown", daysSince: 0, daysUntilDue: 0 }
  }

  const daysSince = differenceInDays(today, last)
  const daysUntilDue = interval - daysSince

  if (daysSince > interval) {
    return { status: "overdue", daysSince, daysUntilDue }
  }
  if (daysUntilDue <= DUE_SOON_WINDOW_DAYS && daysUntilDue > 0) {
    return { status: "due_soon", daysSince, daysUntilDue }
  }
  return { status: "ok", daysSince, daysUntilDue }
}

export function getFarrierStatus(
  lastFarrierDate: string | null | undefined,
  today: Date = new Date()
): CareStatusResult {
  return careStatusFromLastDate(lastFarrierDate, FARRIER_INTERVAL_DAYS, today)
}

export function getDentalStatus(
  lastDentalDate: string | null | undefined,
  today: Date = new Date()
): CareStatusResult {
  return careStatusFromLastDate(lastDentalDate, DENTAL_INTERVAL_DAYS, today)
}

export function getCareDueSummary(
  horses: HorseTableRow[],
  today: Date = new Date()
): { farrierHorses: HorseTableRow[]; dentalHorses: HorseTableRow[]; totalUnique: number } {
  const farrierHorses: HorseTableRow[] = []
  const dentalHorses: HorseTableRow[] = []
  const anyKeys = new Set<string>()

  for (const h of horses) {
    const f = getFarrierStatus(h.lastFarrier ?? h.lastFarrierDate, today)
    const d = getDentalStatus(h.lastDentalDate, today)
    const farrierQualifies = f.status === "overdue" || f.status === "due_soon"
    const dentalQualifies = d.status === "overdue" || d.status === "due_soon"
    if (farrierQualifies) farrierHorses.push(h)
    if (dentalQualifies) dentalHorses.push(h)
    if (farrierQualifies || dentalQualifies) anyKeys.add(horseRowKey(h))
  }

  return { farrierHorses, dentalHorses, totalUnique: anyKeys.size }
}
