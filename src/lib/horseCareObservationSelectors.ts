import { format } from "date-fns"
import type { HorseTableRow } from "@/components/RanchWiseHorseRoster"
import { parseObservationDate } from "@/lib/initialObservations"
import type { ObservationEntry } from "@/types/observation"

function careTextBlob(o: ObservationEntry): string {
  return [
    o.notes ?? "",
    o.aiResult?.patternNote ?? "",
    ...(o.aiResult?.recommendations ?? []),
  ]
    .join(" ")
    .toLowerCase()
}

/**
 * Option B: keyword heuristics on observation text (no structured care category on `ObservationEntry` yet).
 * Follow-up: add explicit care-event fields or categories when the product defines them.
 */
export function isHorseFarrierCareObservation(o: ObservationEntry): boolean {
  return /\b(farrier|shoe|shoeing|trim|trimmed|barefoot|hoof\s*care|hooves)\b/i.test(careTextBlob(o))
}

export function isHorseDentalCareObservation(o: ObservationEntry): boolean {
  return /\b(dental|float|floated|teeth|dentistry|oral\s*exam)\b/i.test(careTextBlob(o))
}

function observationDateToIsoDateOnly(entry: ObservationEntry): string | null {
  const t = parseObservationDate(entry.date)
  if (!Number.isFinite(t) || t <= 0) return null
  return format(new Date(t), "yyyy-MM-dd")
}

function latestMatchingCareIso(
  horseKey: string,
  observationsByHorse: Record<string, ObservationEntry[]>,
  pred: (o: ObservationEntry) => boolean
): string | null {
  const list = observationsByHorse[horseKey] ?? []
  const matches = list.filter(pred)
  if (matches.length === 0) return null
  const sorted = [...matches].sort((a, b) => parseObservationDate(b.date) - parseObservationDate(a.date))
  return observationDateToIsoDateOnly(sorted[0]!)
}

/** ISO yyyy-mm-dd from latest farrier-keyword observation, else row-stored dates. */
export function getHorseEffectiveLastFarrierIso(
  horseKey: string,
  observationsByHorse: Record<string, ObservationEntry[]>,
  row: Pick<HorseTableRow, "lastFarrier" | "lastFarrierDate">
): string | null {
  const fromObs = latestMatchingCareIso(horseKey, observationsByHorse, isHorseFarrierCareObservation)
  if (fromObs) return fromObs
  const v = row.lastFarrierDate?.trim() || row.lastFarrier?.trim()
  return v || null
}

/** ISO yyyy-mm-dd from latest dental-keyword observation, else row `lastDentalDate`. */
export function getHorseEffectiveLastDentalIso(
  horseKey: string,
  observationsByHorse: Record<string, ObservationEntry[]>,
  row: Pick<HorseTableRow, "lastDentalDate">
): string | null {
  const fromObs = latestMatchingCareIso(horseKey, observationsByHorse, isHorseDentalCareObservation)
  if (fromObs) return fromObs
  const v = row.lastDentalDate?.trim()
  return v || null
}
