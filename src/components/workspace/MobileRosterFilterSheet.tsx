import { X } from "lucide-react"
import { createPortal } from "react-dom"
import { Button } from "@/components/ui/button"
import { useOverlayRegistration } from "@/contexts/OverlayRegistryContext"

type MobileRosterFilterSheetProps = {
  open: boolean
  title: string
  onClose: () => void
  children: React.ReactNode
}

/**
 * Mobile-only full-width bottom sheet for roster filters so panels are not clipped by
 * overflow ancestors. Desktop keeps inline absolute dropdowns.
 */
export function MobileRosterFilterSheet({ open, title, onClose, children }: MobileRosterFilterSheetProps) {
  useOverlayRegistration(open)
  if (!open || typeof document === "undefined") return null

  return createPortal(
    <div
      className="fixed inset-0 z-[80] bg-black/30"
      role="presentation"
      onPointerDown={(e) => {
        // Close only when the user taps the scrim itself, not bubbled events from inside the sheet.
        if (e.target === e.currentTarget) onClose()
      }}
      onClick={(e) => {
        // Fallback for browsers that dispatch click without pointer events.
        if (e.target === e.currentTarget) onClose()
      }}
    >
      <div
        className="absolute bottom-0 left-0 right-0 flex max-h-[min(85vh,620px)] flex-col rounded-t-2xl border border-border bg-card shadow-xl"
        role="dialog"
        aria-modal="true"
        aria-labelledby="mobile-roster-filter-sheet-title"
        data-mobile-roster-filter-sheet=""
        onClick={(e) => e.stopPropagation()}
        onPointerDown={(e) => e.stopPropagation()}
      >
        <div className="flex shrink-0 items-center justify-between gap-3 border-b border-border px-4 py-3">
          <h2 id="mobile-roster-filter-sheet-title" className="text-base font-medium text-foreground">
            {title}
          </h2>
          <Button
            type="button"
            variant="ghost"
            size="icon"
            className="shrink-0"
            aria-label="Close filters"
            onClick={onClose}
          >
            <X className="size-4" aria-hidden />
          </Button>
        </div>
        <div className="min-h-0 overflow-y-auto px-4 py-3 pb-[max(1rem,env(safe-area-inset-bottom))]">{children}</div>
      </div>
    </div>,
    document.body,
  )
}
