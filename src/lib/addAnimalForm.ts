import { differenceInYears, parseISO } from "date-fns"
import { cattleTagBare } from "@/lib/cattleUi"
import { BREED_OPTIONS, type Breed, type Cattle, type CattleInventoryStatus } from "@/types/cattle"

export const ADD_ANIMAL_BREED_OPTIONS = BREED_OPTIONS

export const ADD_ANIMAL_SEX_OPTIONS = ["Bull", "Cow", "Heifer", "Steer", "Calf"] as const

export const ADD_ANIMAL_STATUS_OPTIONS: { value: CattleInventoryStatus; label: string }[] = [
  { value: "active", label: "Active" },
  { value: "deceased", label: "Deceased" },
  { value: "sold", label: "Sold" },
  { value: "quarantined", label: "Quarantined" },
]

/** Saved payload / API shape (subset of form). */
export interface NewAnimal {
  tagNumber: string
  name?: string
  breed: string
  sex: string
  dateOfBirth?: string
  weightLbs?: number
  status: CattleInventoryStatus
  pastureId?: string
  notes?: string
  dateOfDeath?: string
  saleDate?: string
  buyer?: string
}

export type AddAnimalFormState = {
  tagNumber: string
  name: string
  breed: string
  sex: string
  dateOfBirth: string
  weightLbs: string
  status: CattleInventoryStatus
  pastureId: string
  notes: string
  dateOfDeath: string
  saleDate: string
  buyer: string
}

export function emptyAddAnimalFormState(defaultPastureId?: string): AddAnimalFormState {
  return {
    tagNumber: "",
    name: "",
    breed: "",
    sex: "",
    dateOfBirth: "",
    weightLbs: "",
    status: "active",
    pastureId: defaultPastureId ?? "",
    notes: "",
    dateOfDeath: "",
    saleDate: "",
    buyer: "",
  }
}

export function addAnimalFormRequiredOk(s: AddAnimalFormState): boolean {
  return (
    s.tagNumber.trim().length > 0 &&
    s.breed !== "" &&
    s.sex !== "" &&
    ADD_ANIMAL_STATUS_OPTIONS.some((o) => o.value === s.status)
  )
}

function ageFromDateOfBirth(iso: string | undefined): number {
  if (!iso?.trim()) return 1
  try {
    const d = parseISO(iso)
    if (Number.isNaN(d.getTime())) return 1
    const y = differenceInYears(new Date(), d)
    return Math.max(0, y || 1)
  } catch {
    return 1
  }
}

export function buildCattleFromAddAnimalForm(
  s: AddAnimalFormState,
  opts: { defaultPastureId?: string; fallbackPastureId: string }
): Cattle | null {
  if (!addAnimalFormRequiredOk(s)) return null
  const pastureId =
    s.pastureId.trim() || opts.defaultPastureId?.trim() || opts.fallbackPastureId
  const weightTrim = s.weightLbs.trim()
  const weightLbs =
    weightTrim === "" ? undefined : Number.parseFloat(weightTrim.replace(/,/g, ""))
  const weightOk = weightLbs !== undefined && Number.isFinite(weightLbs) ? weightLbs : undefined

  const row: Cattle = {
    id: `ct-${crypto.randomUUID()}`,
    tagNumber: cattleTagBare(s.tagNumber.trim()),
    breed: s.breed as Breed,
    age: ageFromDateOfBirth(s.dateOfBirth || undefined),
    pastureId,
    dueDate: null,
    calvingStatus: "calved",
    healthStatus: "Good",
    displayName: s.name.trim() || undefined,
    sexLabel: s.sex,
    dateOfBirthIso: s.dateOfBirth.trim() || undefined,
    weightLbs: weightOk,
    inventoryStatus: s.status,
    notes: s.notes.trim() || undefined,
    dateOfDeath: s.dateOfDeath.trim() || undefined,
    saleDate: s.saleDate.trim() || undefined,
    buyer: s.buyer.trim() || undefined,
  }
  return row
}

export function formStateToNewAnimal(s: AddAnimalFormState): NewAnimal | null {
  if (!addAnimalFormRequiredOk(s)) return null
  const weightTrim = s.weightLbs.trim()
  const weightLbs =
    weightTrim === "" ? undefined : Number.parseFloat(weightTrim.replace(/,/g, ""))
  return {
    tagNumber: cattleTagBare(s.tagNumber.trim()),
    name: s.name.trim() || undefined,
    breed: s.breed,
    sex: s.sex,
    dateOfBirth: s.dateOfBirth.trim() || undefined,
    weightLbs: weightLbs !== undefined && Number.isFinite(weightLbs) ? weightLbs : undefined,
    status: s.status,
    pastureId: s.pastureId.trim() || undefined,
    notes: s.notes.trim() || undefined,
    dateOfDeath: s.dateOfDeath.trim() || undefined,
    saleDate: s.saleDate.trim() || undefined,
    buyer: s.buyer.trim() || undefined,
  }
}
