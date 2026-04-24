import { getStatusBadgeClass } from "@/lib/statusUtils"

/**
 * RanchWise health / risk status fills for horse roster rows (`getStatusBadgeClass`).
 * Calving timeline chips use amber for “calving soon” (not horse Monitor status).
 */

/** Horse roster `status` uses `"flag"`; AI / badges use `"call-vet"`. */
export const horseRowStatusBadgeFill = {
  good: getStatusBadgeClass("Good"),
  monitor: getStatusBadgeClass("Monitor"),
  flag: getStatusBadgeClass("Flag"),
} as const

/** Pasture / herd summary chips: urgency → calving week tint, monitored herd → Monitor, etc. */
export const pastureSignalBadgeFill = {
  calvingSoon: getStatusBadgeClass("Calving soon"),
  flagged: getStatusBadgeClass("Flag"),
  monitored: getStatusBadgeClass("Monitor"),
  clear: getStatusBadgeClass("Good"),
} as const
