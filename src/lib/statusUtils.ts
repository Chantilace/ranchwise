import type { RiskLevel } from "@/types/observation"

/**
 * Shared status pills — one utility: layout, radius, type scale, and tint tokens.
 * Prefer this over ad-hoc `bg-badge-*` / `text-badge-*` on spans.
 */

/**
 * Dense roster / data-table status geometry (13px minimum).
 * Use `getTableStatusBadgeClass` / `getTablePastureStatusBadgeClass` or `StatusBadge` size `table`.
 */
export const STATUS_BADGE_TABLE_BASE =
  "inline-flex items-center whitespace-nowrap rounded-md px-2 py-0.5 text-[13px] font-medium"

/**
 * Card / modal / list row status geometry (13px minimum).
 * Use `getStatusBadgeClass` / `getPastureStatusBadgeClass` or `StatusBadge` size `md` (default).
 */
export const STATUS_BADGE_CARD_BASE =
  "inline-flex items-center whitespace-nowrap rounded-md px-2.5 py-0.5 text-[13px] font-medium"

export const STATUS_TOKENS = {
  good: {
    badge: "bg-status-good-bg text-status-good-text",
    badgePrimary: "bg-status-good-primary text-status-good-primary-fg",
    badgeOutline: "bg-transparent text-status-good-primary border border-status-good-primary",
    /** Same ink as filled secondary badge text; transparent fill (calving tertiary pills). */
    badgeOutlineMuted: "bg-transparent text-status-good-text border border-status-good-text",
    dot: "bg-status-good-primary",
    swatch: "bg-status-good-bg",
  },
  monitor: {
    badge: "bg-status-monitor-bg text-status-monitor-text",
    badgePrimary: "bg-status-monitor-primary text-status-monitor-primary-fg",
    badgeOutline: "bg-transparent text-status-monitor-primary border border-status-monitor-primary",
    badgeOutlineMuted: "bg-transparent text-status-monitor-text border border-status-monitor-text",
    dot: "bg-status-monitor-primary",
    swatch: "bg-status-monitor-bg",
  },
  flag: {
    badge: "bg-status-flag-bg text-status-flag-text",
    badgePrimary: "bg-status-flag-primary text-status-flag-primary-fg",
    badgeOutline: "bg-transparent text-status-flag-primary border border-status-flag-primary",
    badgeOutlineMuted: "bg-transparent text-status-flag-text border border-status-flag-text",
    dot: "bg-status-flag-primary",
    swatch: "bg-status-flag-bg",
  },
} as const

export type StatusCanonical = keyof typeof STATUS_TOKENS
export type StatusEmphasis = "primary" | "secondary" | "outline" | "outlineMuted"

/** Pasture roster semantic status — reuses good / monitor / flag color ramps (no new CSS colors). */
export type PastureStatus = "stable" | "concern" | "action_needed"

export const PASTURE_STATUS_LABELS: Record<PastureStatus, string> = {
  stable: "Stable",
  concern: "Concern",
  action_needed: "Action needed",
}

const PASTURE_TO_CANONICAL: Record<PastureStatus, StatusCanonical> = {
  stable: "good",
  concern: "monitor",
  action_needed: "flag",
}

/** Map a pasture status to its canonical good/monitor/flag equivalent (e.g. to render standard status labels). */
export function pastureStatusToCanonical(status: PastureStatus): StatusCanonical {
  return PASTURE_TO_CANONICAL[status]
}

/** Profile hero / identity row: Good and Stable stay secondary (soft tint); Monitor, Concern, Flag, and Action needed use primary solid ramp (Policy B). */
export type ProfileIdentityBadgeStatus = StatusCanonical | PastureStatus

export function profileIdentityStatusEmphasis(
  status: ProfileIdentityBadgeStatus,
): StatusEmphasis {
  if (status === "good" || status === "stable") return "secondary"
  return "primary"
}

function badgeVariantClass(canonical: StatusCanonical, emphasis: StatusEmphasis): string {
  const variantKey =
    emphasis === "primary" ? "badgePrimary" :
    emphasis === "outline" ? "badgeOutline" :
    emphasis === "outlineMuted" ? "badgeOutlineMuted" :
    "badge"
  return STATUS_TOKENS[canonical][variantKey]
}

function routeToCanonical(status: string): StatusCanonical | null {
  const normalized = status.trim().toLowerCase().replace(/\s+/g, "-")
  switch (normalized) {
    case "good":
    case "green":
    case "calved":
      return "good"
    case "monitor":
    case "amber":
    case "calving-soon":
    case "pregnant":
    case "in-labor":
    case "complications":
      return "monitor"
    case "flag":
    case "urgent":
    case "overdue":
    case "call-vet":
      return "flag"
    default:
      return null
  }
}

/** Data tables and roster grids — 11px table geometry. */
export function getTableStatusBadgeClass(
  status: string,
  emphasis: StatusEmphasis = "secondary",
): string {
  const canonical = routeToCanonical(status)
  if (!canonical) {
    return `${STATUS_BADGE_TABLE_BASE} bg-muted text-muted-foreground`
  }
  return `${STATUS_BADGE_TABLE_BASE} ${badgeVariantClass(canonical, emphasis)}`
}

/** Cards, modals, and list rows — ~12px card geometry. */
export function getStatusBadgeClass(
  status: string,
  emphasis: StatusEmphasis = "secondary",
): string {
  const canonical = routeToCanonical(status)
  if (!canonical) {
    return `${STATUS_BADGE_CARD_BASE} bg-muted text-muted-foreground`
  }
  return `${STATUS_BADGE_CARD_BASE} ${badgeVariantClass(canonical, emphasis)}`
}

/** Pasture semantic status — table / roster density. */
export function getTablePastureStatusBadgeClass(
  status: PastureStatus,
  emphasis: StatusEmphasis = "secondary",
): string {
  const canonical = PASTURE_TO_CANONICAL[status]
  return `${STATUS_BADGE_TABLE_BASE} ${badgeVariantClass(canonical, emphasis)}`
}

/** Pasture semantic status — card / modal density. */
export function getPastureStatusBadgeClass(
  status: PastureStatus,
  emphasis: StatusEmphasis = "secondary",
): string {
  const canonical = PASTURE_TO_CANONICAL[status]
  return `${STATUS_BADGE_CARD_BASE} ${badgeVariantClass(canonical, emphasis)}`
}

export function getStatusDotClass(status: string): string {
  const canonical = routeToCanonical(status)
  return canonical ? STATUS_TOKENS[canonical].dot : "bg-muted"
}

export function getPastureStatusDotClass(status: PastureStatus): string {
  return STATUS_TOKENS[PASTURE_TO_CANONICAL[status]].dot
}

/** Tint-fill dot for an observation row from AI `riskLevel` (secondary badge ramp, same as pills). */
export function getObservationTimelineDotClass(level: RiskLevel | null): string {
  if (level === "good") return STATUS_TOKENS.good.dot
  if (level === "monitor") return STATUS_TOKENS.monitor.dot
  if (level === "flag") return STATUS_TOKENS.flag.dot
  return "bg-muted"
}
