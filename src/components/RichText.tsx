import type { LucideIcon } from "lucide-react"
import type { HTMLAttributes, ReactNode } from "react"

import { cn } from "@/lib/utils"

const variantClass = {
  warning: "text-status-monitor-text",
  attention: "text-status-monitor-text",
  muted: "text-muted-foreground",
  info: "text-badge-blue-text",
} as const

export type RichTextVariant = keyof typeof variantClass

export type RichTextProps = Omit<HTMLAttributes<HTMLSpanElement>, "children"> & {
  variant: RichTextVariant
  children: ReactNode
  /** When set, variant tint applies only to this icon; body text stays `text-foreground`. */
  icon?: LucideIcon
  iconSide?: "left" | "right"
}

/**
 * Semantic tint: either whole inline text (`icon` omitted) or icon + plain foreground text
 * (`icon` set — use for cattle due dates so only the glyph carries urgency color).
 */
export function RichText({
  variant,
  className,
  children,
  icon: Icon,
  iconSide = "left",
  ...props
}: RichTextProps) {
  if (Icon) {
    const iconEl = (
      <Icon
        className={cn("size-3 shrink-0", variantClass[variant])}
        strokeWidth={2}
        aria-hidden
      />
    )
    return (
      <span className={cn("inline-flex items-center gap-1.5 text-foreground", className)} {...props}>
        {iconSide === "left" ? iconEl : null}
        {children}
        {iconSide === "right" ? iconEl : null}
      </span>
    )
  }

  return (
    <span className={cn(variantClass[variant], className)} {...props}>
      {children}
    </span>
  )
}
