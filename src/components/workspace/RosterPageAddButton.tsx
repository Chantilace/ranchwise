import type { ReactNode } from "react"
import { Button } from "@/components/ui/button"
import { cn } from "@/lib/utils"

type RosterPageAddButtonProps = {
  children: ReactNode
  onClick: () => void
  className?: string
}

/**
 * Roster page header Add control — matches {@link LogObservationModal} Cancel (`variant="secondary"`).
 */
export function RosterPageAddButton({ children, onClick, className }: RosterPageAddButtonProps) {
  return (
    <Button
      type="button"
      variant="secondary"
      className={cn("h-9 min-h-9 shrink-0 px-4 py-0 text-[13px] font-medium leading-none", className)}
      onClick={onClick}
    >
      {children}
    </Button>
  )
}
