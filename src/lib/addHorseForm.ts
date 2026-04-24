import type { FeedOption } from "@/lib/constants"

export type NewHorseData = {
  name: string
  sex: "Mare" | "Gelding" | "Stallion" | "Filly" | "Colt"
  age: number
  role: "Working" | "Training" | "Breeding" | "Retired"
  pasture: string
  photo?: string
  feed?: FeedOption[]
  notes?: string
}
