import type { ReactNode } from "react"

export function IdentityChip({ children }: { children: ReactNode }) {
  return (
    <span className="inline-flex items-center rounded-lg bg-muted px-2 py-0.5 text-[13px] font-medium text-fg-muted">
      {children}
    </span>
  )
}
