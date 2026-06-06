import { addDays, formatISO } from "date-fns"
import { isCattlePregnancyCheckNA } from "@/lib/cattlePregnancyCheck"
import type { Breed, Cattle, Pasture } from "@/types/cattle"

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
    terrain: "Sage-scrub",
    acreage: 240,
    waterSource: "Troughs + east creek branch",
    fenceStatus: "Hot wire good · north span monitored",
    profileImageUrl:
      "https://images.unsplash.com/photo-1721053136294-07b5b048cd0b?q=80&w=800&auto=format&fit=crop",
  },
  {
    id: "northeast",
    name: "Northeast Pasture",
    type: "experienced",
    animalCount: 60,
    lastObservation: "1 day ago",
    terrain: "Creek-fed meadow",
    acreage: 180,
    waterSource: "Pond + automatic float",
    fenceStatus: "Perimeter tight · brace schedule routine",
    profileImageUrl:
      "https://images.unsplash.com/photo-1721053139416-4e292709c019?q=80&w=800&auto=format&fit=crop",
  },
  {
    id: "southeast",
    name: "Southeast Pasture",
    type: "experienced",
    animalCount: 60,
    lastObservation: "4 hrs ago",
    terrain: "High meadow",
    acreage: 320,
    waterSource: "Crossing tanks + seasonal creek",
    fenceStatus: "Wood posts sound · south corner trimmed",
    profileImageUrl:
      "https://images.unsplash.com/photo-1607990024537-07346a508700?q=80&w=800&auto=format&fit=crop",
  },
  {
    id: "west",
    name: "West Pasture",
    type: "bulls",
    animalCount: 30,
    lastObservation: "3 days ago",
    terrain: "Open range",
    acreage: 410,
    waterSource: "Tank + solar pump",
    fenceStatus: "H-brace temp repair · permanent fix queued",
    profileImageUrl:
      "https://images.unsplash.com/photo-1660356816730-f3a4c99b33e7?q=80&w=800&auto=format&fit=crop",
  },
  {
    id: "northwest",
    name: "Northwest Pasture",
    type: "first-timers",
    animalCount: 60,
    lastObservation: "2 days ago",
    terrain: "Sage flats",
    acreage: 290,
    waterSource: "Four automatic waterers",
    fenceStatus: "Hot wire tested · gate hardware greased",
    profileImageUrl:
      "https://images.unsplash.com/photo-1585264817373-165f389383dc?q=80&w=800&auto=format&fit=crop",
  },
]

// Helper arrays (typed as `Breed` so `Array.from` rows satisfy `Cattle.breed`)
const HEIFER_BREEDS: readonly Breed[] = [
  "Angus",
  "Angus",
  "Angus",
  "Hereford",
  "Hereford",
  "Longhorn",
  "Simmental",
  "Red Angus",
  "Angus",
  "Angus",
]
const COW_BREEDS: readonly Breed[] = [
  "Angus",
  "Angus",
  "Angus",
  "Angus",
  "Hereford",
  "Hereford",
  "Longhorn",
  "Simmental",
  "Red Angus",
  "Angus",
  "Angus",
  "Angus",
]
const BULL_BREEDS: readonly Breed[] = [
  "Angus",
  "Angus",
  "Angus",
  "Hereford",
  "Hereford",
  "Longhorn",
  "Simmental",
  "Angus",
  "Red Angus",
  "Angus",
]
const JUV_BREEDS: readonly Breed[] = [
  "Angus",
  "Angus",
  "Angus",
  "Hereford",
  "Hereford",
  "Longhorn",
  "Angus",
  "Red Angus",
  "Angus",
  "Angus",
]

function breed(arr: readonly Breed[], i: number): Breed {
  return arr[i % arr.length]!
}

/** Authoritative health comes from observations; roster seed uses Good baseline. */
const HS: "Good" = "Good"

// ─── HEIFERS (East Pasture, 48) — late calving season (~day 56/60) ───────────
// Mostly calved; few calving-soon; opens; one post-calving complications watch.
// No stored in-labor (keeps Smart Suggestions cattle at Watch, not High).

const HEIFERS: Cattle[] = Array.from({ length: 48 }, (_, i) => {
  const n = i + 1
  const tag = `H${String(n).padStart(3, "0")}`
  const age = n % 3 === 0 ? 3 : 2

  let calvingStatus: Cattle["calvingStatus"] = "pregnant"
  let dueDate: string | null = null
  let calvingDate: string | null = null
  let deliveryType: Cattle["deliveryType"] = undefined
  let calfStatus: Cattle["calfStatus"] = undefined
  let calvingComplications: Cattle["calvingComplications"] = undefined

  if (n <= 40) {
    calvingStatus = "calved"
    calvingDate = isoDateFromToday(-(6 + (n % 40)))
    deliveryType = n % 3 === 0 ? "assisted" : "normal"
    calfStatus = "live"
  } else if (n <= 43) {
    calvingStatus = "pregnant"
    dueDate = isoDateFromToday(1 + (n - 41))
  } else if (n <= 47) {
    calvingStatus = "none"
    dueDate = null
  } else {
    calvingStatus = "calved"
    dueDate = null
    calvingDate = isoDateFromToday(-4)
    deliveryType = "assisted"
    calfStatus = "live"
    calvingComplications = ["retained-placenta"]
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
    healthStatus: HS,
    lastObservation,
  }
})

// ─── NORTHEAST COWS (60) ───────────────────────────────────────────────────

const NE_COWS: Cattle[] = Array.from({ length: 60 }, (_, i) => {
  const n = i + 1
  const tag = `C${String(n).padStart(3, "0")}`
  const age = 3 + (n % 6)

  let calvingStatus: Cattle["calvingStatus"] = "pregnant"
  let dueDate: string | null = null
  let calvingDate: string | null = null
  let deliveryType: Cattle["deliveryType"] = undefined
  let calfStatus: Cattle["calfStatus"] = undefined
  let calvingComplications: Cattle["calvingComplications"] = undefined

  if (n <= 44) {
    calvingStatus = "calved"
    calvingDate = isoDateFromToday(-(4 + (n % 35)))
    deliveryType = n % 4 === 0 ? "assisted" : "normal"
    calfStatus = "live"
  } else if (n <= 46) {
    calvingStatus = "pregnant"
    dueDate = isoDateFromToday(2 + (n - 45))
  } else if (n <= 58) {
    calvingStatus = "none"
    dueDate = null
  } else if (n === 59) {
    calvingStatus = "pregnant"
    dueDate = isoDateFromToday(22)
  } else {
    calvingStatus = "calved"
    dueDate = null
    calvingDate = isoDateFromToday(-5)
    deliveryType = "normal"
    calfStatus = "live"
    calvingComplications = ["prolapse"]
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
    healthStatus: HS,
    lastObservation,
  }
})

// ─── SOUTHEAST COWS (60) ───────────────────────────────────────────────────

const SE_COWS: Cattle[] = Array.from({ length: 60 }, (_, i) => {
  const n = i + 1
  const tag = `C${String(n + 60).padStart(3, "0")}`
  const age = 3 + (n % 7)

  let calvingStatus: Cattle["calvingStatus"] = "pregnant"
  let dueDate: string | null = null
  let calvingDate: string | null = null
  let deliveryType: Cattle["deliveryType"] = undefined
  let calfStatus: Cattle["calfStatus"] = undefined
  let calvingComplications: Cattle["calvingComplications"] = undefined

  if (n <= 45) {
    calvingStatus = "calved"
    calvingDate = isoDateFromToday(-(5 + (n % 32)))
    deliveryType = n % 5 === 0 ? "assisted" : "normal"
    calfStatus = "live"
  } else if (n === 46) {
    calvingStatus = "pregnant"
    dueDate = isoDateFromToday(4)
  } else if (n <= 57) {
    calvingStatus = "none"
    dueDate = null
  } else if (n <= 59) {
    calvingStatus = "pregnant"
    dueDate = isoDateFromToday(19 + (n - 58))
  } else {
    calvingStatus = "calved"
    dueDate = null
    calvingDate = isoDateFromToday(-3)
    deliveryType = "assisted"
    calfStatus = "live"
    calvingComplications = ["retained-placenta"]
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
    healthStatus: HS,
    lastObservation,
  }
})

// ─── BULLS (West Pasture, 30) ───────────────────────────────────────────────

const BULLS: Cattle[] = Array.from({ length: 30 }, (_, i) => {
  const n = i + 1
  const tag = `B${String(n).padStart(3, "0")}`
  const age = 2 + (n % 5)

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
    healthStatus: HS,
    lastObservation,
  }
})

// ─── JUVENILES (Northwest Pasture, 60) — season calves ──────────────────────
// Female juveniles (Cow/Heifer) carry a recent "calved" record; bulls never
// calve, so they stay calvingStatus "none" with no calving fields.

const JUVENILES: Cattle[] = Array.from({ length: 60 }, (_, i) => {
  const n = i + 1
  const tag = `J${String(n).padStart(3, "0")}`
  const sexLabel = n % 3 === 0 ? "Bull" : n % 2 === 0 ? "Heifer" : "Cow"
  const isFemale = sexLabel === "Cow" || sexLabel === "Heifer"

  const lastObsOptions = ["2 days ago", "3 days ago", "4 days ago", "5 days ago", "1 week ago"]
  const lastObservation = lastObsOptions[n % lastObsOptions.length]

  const calvingFields = isFemale
    ? {
        calvingStatus: "calved" as const,
        calvingDate: isoDateFromToday(-(3 + (n % 20))),
        deliveryType: "normal" as const,
        calfStatus: "live" as const,
      }
    : { calvingStatus: "none" as const }

  return {
    id: `ct-nw-${n}`,
    tagNumber: tag,
    breed: breed(JUV_BREEDS, i),
    sexLabel,
    age: 0,
    pastureId: "northwest",
    dueDate: null,
    ...calvingFields,
    healthStatus: HS,
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