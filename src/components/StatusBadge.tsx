import { cn } from "@/lib/utils"
import { STATUS_TOKENS, type StatusCanonical, type StatusEmphasis } from "@/lib/statusUtils"

export type StatusBadgeStatus = "good" | "monitor" | "call-vet"

export interface StatusBadgeProps {
  status: StatusBadgeStatus
  /** When set, renders e.g. `Health · Monitor` instead of status label alone. */
  label?: string
  /** With `label`, shows only the dimension text (e.g. `Health`); fill still follows `status`. */
  compactLabel?: boolean
  size?: "sm" | "md" | "lg"
  emphasis?: StatusEmphasis
  className?: string
}

const statusConfig = {
  good: { label: "Good" as const },
  monitor: { label: "Monitor" as const },
  "call-vet": { label: "Flag" as const },
} as const

const canonicalByStatus: Record<StatusBadgeStatus, StatusCanonical> = {
  good: "good",
  monitor: "monitor",
  "call-vet": "flag",
}

const sizeClass: Record<NonNullable<StatusBadgeProps["size"]>, string> = {
  sm: "rounded-md px-[6px] py-px text-[10px] font-medium",
  md: "rounded-lg px-2 py-0.5 text-[11px] font-medium",
  lg: "rounded-lg px-3 py-1 text-sm font-semibold",
}

function getFillClass(canonical: StatusCanonical, emphasis: StatusEmphasis): string {
  if (emphasis === "primary") return STATUS_TOKENS[canonical].badgePrimary
  if (emphasis === "outline") return STATUS_TOKENS[canonical].badgeOutline
  return STATUS_TOKENS[canonical].badge
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
  const canonical = canonicalByStatus[status]
  return (
    <span className={cn(sizeClass[size], getFillClass(canonical, emphasis), className)}>
      {text}
    </span>
  )
}
