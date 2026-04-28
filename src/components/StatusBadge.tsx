import { cn } from "@/lib/utils"
import {
  PASTURE_STATUS_LABELS,
  getPastureStatusBadgeClass,
  getTablePastureStatusBadgeClass,
  getTableStatusBadgeClass,
  getStatusBadgeClass,
  STATUS_TOKENS,
  type PastureStatus,
  type StatusCanonical,
  type StatusEmphasis,
} from "@/lib/statusUtils"

export type { PastureStatus } from "@/lib/statusUtils"

/** Health / risk + pasture semantic statuses (pasture reuses good / monitor / flag ramps). */
export type StatusBadgeStatus = "good" | "monitor" | "call-vet" | PastureStatus

export interface StatusBadgeProps {
  status: StatusBadgeStatus
  /** When set, renders e.g. `Health · Monitor` instead of status label alone. */
  label?: string
  /** With `label`, shows only the dimension text (e.g. `Health`); fill still follows `status`. */
  compactLabel?: boolean
  size?: "sm" | "md" | "lg" | "table"
  emphasis?: StatusEmphasis
  className?: string
}

const statusConfig: Record<StatusBadgeStatus, { label: string }> = {
  good: { label: "Good" },
  monitor: { label: "Monitor" },
  "call-vet": { label: "Flag" },
  stable: { label: PASTURE_STATUS_LABELS.stable },
  concern: { label: PASTURE_STATUS_LABELS.concern },
  action_needed: { label: PASTURE_STATUS_LABELS.action_needed },
}

const canonicalByStatus: Record<StatusBadgeStatus, StatusCanonical> = {
  good: "good",
  monitor: "monitor",
  "call-vet": "flag",
  stable: "good",
  concern: "monitor",
  action_needed: "flag",
}

function isPastureBadgeStatus(s: StatusBadgeStatus): s is PastureStatus {
  return s === "stable" || s === "concern" || s === "action_needed"
}

const sizeClassSm =
  "whitespace-nowrap rounded-md px-[6px] py-px text-[13px] font-medium"
const sizeClassLg =
  "whitespace-nowrap rounded-lg px-3 py-1 text-sm font-semibold"

function getFillClass(canonical: StatusCanonical, emphasis: StatusEmphasis): string {
  if (emphasis === "primary") return STATUS_TOKENS[canonical].badgePrimary
  if (emphasis === "outline") return STATUS_TOKENS[canonical].badgeOutline
  if (emphasis === "outlineMuted") return STATUS_TOKENS[canonical].badgeOutlineMuted
  return STATUS_TOKENS[canonical].badge
}

function statusBadgeShellClass(
  status: StatusBadgeStatus,
  size: NonNullable<StatusBadgeProps["size"]>,
  emphasis: StatusEmphasis,
): string {
  if (size === "sm") {
    return cn(sizeClassSm, getFillClass(canonicalByStatus[status], emphasis))
  }
  if (size === "lg") {
    return cn(sizeClassLg, getFillClass(canonicalByStatus[status], emphasis))
  }
  if (size === "table") {
    return isPastureBadgeStatus(status)
      ? getTablePastureStatusBadgeClass(status, emphasis)
      : getTableStatusBadgeClass(status, emphasis)
  }
  // md (default)
  return isPastureBadgeStatus(status)
    ? getPastureStatusBadgeClass(status, emphasis)
    : getStatusBadgeClass(status, emphasis)
}

export function StatusBadge({
  status,
  label,
  compactLabel,
  size = "md",
  emphasis = "secondary",
  className,
}: StatusBadgeProps) {
  const cfg = statusConfig[status]
  const text =
    compactLabel && label
      ? label
      : label
        ? `${label} · ${cfg.label}`
        : cfg.label
  return (
    <span className={cn(statusBadgeShellClass(status, size, emphasis), className)}>
      {text}
    </span>
  )
}
