import type { ReactNode } from "react"

import { cn } from "@/lib/utils"

/** Filled read-only summary row for log / calving analyze–review steps (not editable input styling). */
export function LogReviewFilledField({
  label,
  children,
  className,
}: {
  label: string
  children: ReactNode
  className?: string
}) {
  return (
    <div
      className={cn(
        "rounded-md border-[0.5px] border-[var(--color-border-tertiary)] bg-secondary px-3 py-2.5",
        className,
      )}
    >
      <p className="mb-1 text-[13px] font-medium uppercase tracking-wider text-[var(--color-text-tertiary)]">
        {label}
      </p>
      <div className="whitespace-pre-wrap text-[14px] leading-relaxed text-[var(--color-text-primary)]">
        {children}
      </div>
    </div>
  )
}
