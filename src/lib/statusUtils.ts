import type { RiskLevel } from "@/types/observation"

/**
 * Shared status pills — one utility: layout, radius, type scale, and tint tokens.
 * Prefer this over ad-hoc `bg-badge-*` / `text-badge-*` on spans.
 */

const STATUS_BADGE_BASE = "text-xs font-medium px-2.5 py-0.5 rounded-lg"

export const STATUS_TOKENS = {
  good: {
    badge: "bg-status-good-bg text-status-good-text",
    badgePrimary: "bg-status-good-primary text-status-good-primary-fg",
    badgeOutline: "bg-transparent text-status-good-primary border border-status-good-primary",
    dot: "bg-status-good-primary",
    swatch: "bg-status-good-bg",
  },
  monitor: {
    badge: "bg-status-monitor-bg text-status-monitor-text",
    badgePrimary: "bg-status-monitor-primary text-status-monitor-primary-fg",
    badgeOutline: "bg-transparent text-status-monitor-primary border border-status-monitor-primary",
    dot: "bg-status-monitor-primary",
    swatch: "bg-status-monitor-bg",
  },
  flag: {
    badge: "bg-status-flag-bg text-status-flag-text",
    badgePrimary: "bg-status-flag-primary text-status-flag-primary-fg",
    badgeOutline: "bg-transparent text-status-flag-primary border border-status-flag-primary",
    dot: "bg-status-flag-primary",
    swatch: "bg-status-flag-bg",
  },
} as const

export type StatusCanonical = keyof typeof STATUS_TOKENS
export type StatusEmphasis = "primary" | "secondary" | "outline"

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
      return "monitor"
    case "flag":
    case "urgent":
    case "overdue":
    case "complications":
    case "call-vet":
      return "flag"
    default:
      return null
  }
}

export function getStatusBadgeClass(
  status: string,
  emphasis: StatusEmphasis = "secondary"
): string {
  const canonical = routeToCanonical(status)
  if (!canonical) {
    return `${STATUS_BADGE_BASE} bg-muted text-muted-foreground`
  }
  const variantKey =
    emphasis === "primary" ? "badgePrimary" :
    emphasis === "outline" ? "badgeOutline" :
    "badge"
  return `${STATUS_BADGE_BASE} ${STATUS_TOKENS[canonical][variantKey]}`
}

export function getStatusDotClass(status: string): string {
  const canonical = routeToCanonical(status)
  return canonical ? STATUS_TOKENS[canonical].dot : "bg-muted"
}

/** Tint-fill dot for an observation row from AI `riskLevel` (secondary badge ramp, same as pills). */
export function getObservationTimelineDotClass(level: RiskLevel | null): string {
  if (level === "good") return STATUS_TOKENS.good.dot
  if (level === "monitor") return STATUS_TOKENS.monitor.dot
  if (level === "call-vet") return STATUS_TOKENS.flag.dot
  return "bg-muted"
}
