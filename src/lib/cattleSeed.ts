import { addDays, formatISO } from "date-fns"
import { isCattlePregnancyCheckNA } from "@/lib/cattlePregnancyCheck"
import type { Cattle, Pasture } from "@/types/cattle"

function isoDateFromToday(offsetDays: number): string {
  return formatISO(addDays(new Date(), offsetDays), { representation: "date" })
}

export const PASTURES_SEED: Pasture[] = [
  {
    id: "east",
    name: "East Pasture",
    type: "first-timers",
    animalCount: 48,
    lastObservation: "2 hrs ago",
  },
  {
    id: "northeast",
    name: "Northeast Pasture",
    type: "experienced",
    animalCount: 60,
    lastObservation: "1 day ago",
  },
  {
    id: "southeast",
    name: "Southeast Pasture",
    type: "experienced",
    animalCount: 60,
    lastObservation: "4 hrs ago",
  },
  {
    id: "west",
    name: "West Pasture",
    type: "bulls",
    animalCount: 30,
    lastObservation: "3 days ago",
  },
  {
    id: "northwest",
    name: "Northwest Pasture",
    type: "first-timers",
    animalCount: 60,
    lastObservation: "2 days ago",
  },
]

// Helper arrays
const HEIFER_BREEDS = ["Angus","Angus","Angus","Hereford","Hereford","Longhorn","Simmental","Red Angus","Angus","Angus"]
const COW_BREEDS = ["Angus","Angus","Angus","Angus","Hereford","Hereford","Longhorn","Simmental","Red Angus","Angus","Angus","Angus"]
const BULL_BREEDS = ["Angus","Angus","Angus","Hereford","Hereford","Longhorn","Simmental","Angus","Red Angus","Angus"]
const JUV_BREEDS = ["Angus","Angus","Angus","Hereford","Hereford","Longhorn","Angus","Red Angus","Angus","Angus"]

function breed(arr: string[], i: number): string { return arr[i % arr.length] }

// Health status distribution helper
// Flags: ~6%, Monitor: ~10%, Good: ~84%
function healthStatus(i: number, flagIndices: number[], monitorIndices: number[]): "Flag" | "Monitor" | "Good" {
  if (flagIndices.includes(i)) return "Flag"
  if (monitorIndices.includes(i)) return "Monitor"
  return "Good"
}

// ─── HEIFERS (East Pasture) ────────────────────────────────────────────────
// 48 heifers, first-time pregnant, ages 2-3
// Calving status mix: 20 calving-soon, 18 pregnant, 6 calved, 4 complications
// Flag: 3, Monitor: 5

const heifer_flags = [2, 11, 22]
const heifer_monitors = [5, 9, 15, 28, 35]

const HEIFERS: Cattle[] = Array.from({ length: 48 }, (_, i) => {
  const n = i + 1
  const tag = `#H${String(n).padStart(3, "0")}`
  const age = n % 3 === 0 ? 3 : 2
  const hs = healthStatus(i, heifer_flags, heifer_monitors)

  // calving status distribution
  let calvingStatus: Cattle["calvingStatus"] = "pregnant"
  let dueDate: string | null = null
  let calvingDate: string | null = null
  let deliveryType: Cattle["deliveryType"] = undefined
  let calfStatus: Cattle["calfStatus"] = undefined
  let calvingComplications: Cattle["calvingComplications"] = undefined

  if (n <= 20) {
    // calving soon — due within 14 days
    calvingStatus = "pregnant"
    dueDate = isoDateFromToday((n % 14) + 1)
  } else if (n <= 38) {
    // pregnant — due 15-60 days out
    calvingStatus = "pregnant"
    dueDate = isoDateFromToday(15 + ((n - 20) * 2))
  } else if (n <= 44) {
    // calved
    calvingStatus = "calved"
    dueDate = null
    calvingDate = isoDateFromToday(-(n - 38) * 4)
    deliveryType = n % 2 === 0 ? "assisted" : "normal"
    calfStatus = n === 41 ? "stillborn" : "live"
  } else {
    // complications
    calvingStatus = "complications"
    dueDate = null
    calvingDate = isoDateFromToday(-(n - 44) * 2)
    deliveryType = "assisted"
    calfStatus = "live"
    calvingComplications = n % 2 === 0 ? ["retained-placenta"] : ["prolapse"]
  }

  const lastObsOptions = ["1 hr ago", "3 hrs ago", "6 hrs ago", "12 hrs ago", "1 day ago", "2 days ago"]
  const lastObservation = lastObsOptions[n % lastObsOptions.length]

  return {
    id: `ct-east-${n}`,
    tagNumber: tag,
    breed: breed(HEIFER_BREEDS, i),
    sexLabel: "Heifer",
    age,
    pastureId: "east",
    dueDate,
    calvingStatus,
    calvingDate,
    deliveryType,
    calfStatus,
    calvingComplications,
    healthStatus: hs,
    lastObservation,
  }
})

// ─── NORTHEAST COWS (60) ──────────────────────────────────────────────────
// Experienced cows, ages 3-8
// Mix: 15 calving-soon, 25 pregnant, 12 calved, 5 complications, 3 in-labor
// Flag: 4, Monitor: 7

const ne_flags = [3, 14, 27, 41]
const ne_monitors = [6, 11, 19, 24, 33, 45, 52]

const NE_COWS: Cattle[] = Array.from({ length: 60 }, (_, i) => {
  const n = i + 1
  const tag = `#C${String(n).padStart(3, "0")}`
  const age = 3 + (n % 6)
  const hs = healthStatus(i, ne_flags, ne_monitors)

  let calvingStatus: Cattle["calvingStatus"] = "pregnant"
  let dueDate: string | null = null
  let calvingDate: string | null = null
  let deliveryType: Cattle["deliveryType"] = undefined
  let calfStatus: Cattle["calfStatus"] = undefined
  let calvingComplications: Cattle["calvingComplications"] = undefined
  let inLaborTimestamp: string | null = null

  if (n <= 3) {
    calvingStatus = "in-labor"
    dueDate = isoDateFromToday(0)
    inLaborTimestamp = new Date(Date.now() - (n * 45 * 60 * 1000)).toISOString()
  } else if (n <= 18) {
    calvingStatus = "pregnant"
    dueDate = isoDateFromToday((n % 13) + 1)
  } else if (n <= 43) {
    calvingStatus = "pregnant"
    dueDate = isoDateFromToday(15 + ((n - 18) * 2))
  } else if (n <= 55) {
    calvingStatus = "calved"
    dueDate = null
    calvingDate = isoDateFromToday(-(n - 43) * 3)
    deliveryType = n % 3 === 0 ? "assisted" : "normal"
    calfStatus = "live"
  } else {
    calvingStatus = "complications"
    dueDate = null
    calvingDate = isoDateFromToday(-(n - 55) * 2)
    deliveryType = "assisted"
    calfStatus = n === 58 ? "stillborn" : "live"
    calvingComplications = n % 2 === 0 ? ["retained-placenta"] : ["hemorrhage"]
  }

  const lastObsOptions = ["2 hrs ago", "4 hrs ago", "8 hrs ago", "1 day ago", "2 days ago", "3 days ago"]
  const lastObservation = lastObsOptions[n % lastObsOptions.length]

  return {
    id: `ct-ne-${n}`,
    tagNumber: tag,
    breed: breed(COW_BREEDS, i),
    sexLabel: "Cow",
    age,
    pastureId: "northeast",
    dueDate,
    calvingStatus,
    calvingDate,
    deliveryType,
    calfStatus,
    calvingComplications,
    inLaborTimestamp,
    healthStatus: hs,
    lastObservation,
  }
})

// ─── SOUTHEAST COWS (60) ──────────────────────────────────────────────────
// Experienced cows, ages 3-9
// Mix: 12 calving-soon, 28 pregnant, 14 calved, 4 complications, 2 in-labor
// Flag: 4, Monitor: 6

const se_flags = [7, 18, 31, 49]
const se_monitors = [4, 12, 23, 36, 44, 55]

const SE_COWS: Cattle[] = Array.from({ length: 60 }, (_, i) => {
  const n = i + 1
  const tag = `#C${String(n + 60).padStart(3, "0")}`
  const age = 3 + (n % 7)
  const hs = healthStatus(i, se_flags, se_monitors)

  let calvingStatus: Cattle["calvingStatus"] = "pregnant"
  let dueDate: string | null = null
  let calvingDate: string | null = null
  let deliveryType: Cattle["deliveryType"] = undefined
  let calfStatus: Cattle["calfStatus"] = undefined
  let calvingComplications: Cattle["calvingComplications"] = undefined
  let inLaborTimestamp: string | null = null

  if (n <= 2) {
    calvingStatus = "in-labor"
    dueDate = isoDateFromToday(0)
    inLaborTimestamp = new Date(Date.now() - (n * 30 * 60 * 1000)).toISOString()
  } else if (n <= 14) {
    calvingStatus = "pregnant"
    dueDate = isoDateFromToday((n % 12) + 1)
  } else if (n <= 42) {
    calvingStatus = "pregnant"
    dueDate = isoDateFromToday(15 + ((n - 14) * 2))
  } else if (n <= 56) {
    calvingStatus = "calved"
    dueDate = null
    calvingDate = isoDateFromToday(-(n - 42) * 3)
    deliveryType = n % 4 === 0 ? "assisted" : "normal"
    calfStatus = "live"
  } else {
    calvingStatus = "complications"
    dueDate = null
    calvingDate = isoDateFromToday(-(n - 56) * 2)
    deliveryType = "c-section"
    calfStatus = "live"
    calvingComplications = ["retained-placenta", "hemorrhage"]
  }

  const lastObsOptions = ["1 hr ago", "5 hrs ago", "10 hrs ago", "1 day ago", "2 days ago", "4 days ago"]
  const lastObservation = lastObsOptions[n % lastObsOptions.length]

  return {
    id: `ct-se-${n}`,
    tagNumber: tag,
    breed: breed(COW_BREEDS, i + 3),
    sexLabel: "Cow",
    age,
    pastureId: "southeast",
    dueDate,
    calvingStatus,
    calvingDate,
    deliveryType,
    calfStatus,
    calvingComplications,
    inLaborTimestamp,
    healthStatus: hs,
    lastObservation,
  }
})

// ─── BULLS (West Pasture, 30) ──────────────────────────────────────────────
// Ages 2-6, no calving status, some health flags
// Flag: 2, Monitor: 3

const bull_flags = [4, 17]
const bull_monitors = [8, 21, 26]

const BULLS: Cattle[] = Array.from({ length: 30 }, (_, i) => {
  const n = i + 1
  const tag = `#B${String(n).padStart(3, "0")}`
  const age = 2 + (n % 5)
  const hs = healthStatus(i, bull_flags, bull_monitors)

  const lastObsOptions = ["1 day ago", "2 days ago", "3 days ago", "4 days ago", "1 week ago"]
  const lastObservation = lastObsOptions[n % lastObsOptions.length]

  return {
    id: `ct-west-${n}`,
    tagNumber: tag,
    breed: breed(BULL_BREEDS, i),
    sexLabel: "Bull",
    age,
    pastureId: "west",
    dueDate: null,
    calvingStatus: "none" as const,
    healthStatus: hs,
    lastObservation,
  }
})

// ─── JUVENILES (Northwest Pasture, 60) ────────────────────────────────────
// Born this season, ages 0-1, for sale
// Mix of sexes, mostly good health, a few monitor
// Flag: 1, Monitor: 4

const juv_flags = [13]
const juv_monitors = [7, 22, 38, 51]

const JUVENILES: Cattle[] = Array.from({ length: 60 }, (_, i) => {
  const n = i + 1
  const tag = `#J${String(n).padStart(3, "0")}`
  const sexLabel = n % 3 === 0 ? "Bull" : n % 2 === 0 ? "Heifer" : "Cow"
  const hs = healthStatus(i, juv_flags, juv_monitors)

  const lastObsOptions = ["2 days ago", "3 days ago", "4 days ago", "5 days ago", "1 week ago"]
  const lastObservation = lastObsOptions[n % lastObsOptions.length]

  return {
    id: `ct-nw-${n}`,
    tagNumber: tag,
    breed: breed(JUV_BREEDS, i),
    sexLabel,
    age: 0,
    pastureId: "northwest",
    dueDate: null,
    calvingStatus: "calved" as const,
    calvingDate: isoDateFromToday(-(n * 2)),
    deliveryType: "normal" as const,
    calfStatus: "live" as const,
    healthStatus: hs,
    lastObservation,
  }
})

function hashCattleId(id: string): number {
  let h = 0
  for (let i = 0; i < id.length; i++) h = (Math.imul(31, h) + id.charCodeAt(i)) | 0
  return h >>> 0
}

/** Deterministic demo care-due dates so home pills and `?careDue=` are populated from seed. */
function withDemoCareDueFields(c: Cattle): Cattle {
  const h = hashCattleId(c.id)
  const next: Pick<
    Cattle,
    "vaccinationDueIso" | "dewormingDueIso" | "pregnancyCheckDueIso" | "brandingDueIso"
  > = {}
  if (h % 7 === 0) next.vaccinationDueIso = isoDateFromToday((h % 21) - 15)
  if ((h >>> 2) % 9 === 0) next.dewormingDueIso = isoDateFromToday(((h >>> 1) % 25) - 12)
  if ((h >>> 4) % 11 === 1) next.pregnancyCheckDueIso = isoDateFromToday(((h >>> 3) % 18) - 6)
  if ((h >>> 6) % 13 === 2 && c.calvingStatus === "calved")
    next.brandingDueIso = isoDateFromToday(((h >>> 5) % 16) - 8)
  return Object.keys(next).length === 0 ? c : { ...c, ...next }
}

/** Deterministic last-event dates for roster care columns. */
function withDemoCareLastEvents(c: Cattle): Cattle {
  const h = hashCattleId(c.id)
  const lastVaccinationAt = h % 6 !== 0 ? isoDateFromToday(-12 - (h % 520)) : null
  const lastDewormingAt = (h >>> 1) % 5 !== 0 ? isoDateFromToday(-9 - ((h >>> 1) % 380)) : null
  const lastPregnancyCheckAt = isCattlePregnancyCheckNA(c)
    ? null
    : (h >>> 2) % 7 !== 0
      ? isoDateFromToday(-33 - ((h >>> 2) % 440))
      : null
  const lastBrandingAt =
    (h >>> 4) % 9 !== 0 ? isoDateFromToday(-90 - ((h >>> 4) % 800)) : null
  return {
    ...c,
    lastVaccinationAt,
    lastDewormingAt,
    lastPregnancyCheckAt,
    lastBrandingAt,
  }
}

export const SAMPLE_CATTLE: Cattle[] = [
  ...HEIFERS,
  ...NE_COWS,
  ...SE_COWS,
  ...BULLS,
  ...JUVENILES,
].map((c) => withDemoCareLastEvents(withDemoCareDueFields(c)))

export const PASTURE_TYPE_ORDER: Record<Pasture["type"], number> = {
  "first-timers": 0,
  experienced: 1,
  bulls: 2,
}