import type { EffectiveCalvingStatus } from "@/types/cattle"
import { STATUS_TOKENS } from "@/lib/statusUtils"

/** Left dot in calving checklist rows — matches calving badge token ladder. */
export const calvingFilterSwatchById: Record<EffectiveCalvingStatus, string> = {
  pregnant: STATUS_TOKENS.monitor.swatch,
  "calving-soon": STATUS_TOKENS.monitor.swatch,
  "in-labor": STATUS_TOKENS.monitor.swatch,
  calved: STATUS_TOKENS.good.swatch,
  complications: STATUS_TOKENS.flag.swatch,
  none: "bg-muted",
}

/** Health checklist rows — Flag / Monitor / Good. */
export const healthFilterSwatchById: Record<"Flag" | "Monitor" | "Good", string> = {
  Flag: STATUS_TOKENS.flag.swatch,
  Monitor: STATUS_TOKENS.monitor.swatch,
  Good: STATUS_TOKENS.good.swatch,
}

/** Horse roster status (lowercase ids). */
export const horseStatusFilterSwatchById: Record<"flag" | "monitor" | "good", string> = {
  flag: STATUS_TOKENS.flag.swatch,
  monitor: STATUS_TOKENS.monitor.swatch,
  good: STATUS_TOKENS.good.swatch,
}

/** Horse profile observation AI status filter (menu ids). */
export const observationStatusFilterSwatchById: Record<"good" | "monitor" | "flag", string> = {
  good: STATUS_TOKENS.good.swatch,
  monitor: STATUS_TOKENS.monitor.swatch,
  flag: STATUS_TOKENS.flag.swatch,
}
