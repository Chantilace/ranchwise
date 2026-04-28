import { Dialog } from "@base-ui/react/dialog"
import { X } from "lucide-react"

import { LogObservationFormFooter, useLogObservationFormController } from "@/components/LogObservationModal"
import { buttonVariants } from "@/components/ui/button"
import { PASTURE_SEED_MEDIA } from "@/lib/pastureSeedMedia"
import { cn } from "@/lib/utils"

export function LogPastureCheckSheet({
  open,
  pastureId,
  pastureName,
  pastureSubtitle,
  onClose,
  onSave,
}: {
  open: boolean
  pastureId: string
  pastureName: string
  pastureSubtitle?: string
  onClose: () => void
  onSave: Parameters<typeof useLogObservationFormController>[0]["onSave"]
}) {
  const { body, footerApi } = useLogObservationFormController({
    mode: "sheet",
    animalName: pastureName,
    logMode: "pasture",
    onDismiss: onClose,
    onSave,
  })

  return (
    <Dialog.Root open={open} onOpenChange={(next) => !next && onClose()}>
      <Dialog.Portal>
        <Dialog.Backdrop className="fixed inset-0 z-[120] bg-black/55 backdrop-blur-[1px] transition-opacity data-[ending-style]:opacity-0" />
        <Dialog.Viewport className="fixed inset-0 z-[120] flex items-end justify-center p-0 md:items-center md:p-4">
          <Dialog.Popup
            className={cn(
              "flex w-full max-w-full flex-col border-[0.5px] border-border bg-card text-foreground shadow-xl outline-none",
              "min-h-[44dvh] max-h-[90vh] rounded-t-2xl md:min-h-0 md:max-h-[min(90dvh,680px)] md:max-w-lg md:rounded-2xl",
              "translate-y-0 transition-transform duration-200 ease-out data-[starting-style]:translate-y-full md:data-[starting-style]:translate-y-0 md:data-[starting-style]:scale-95"
            )}
            key={pastureId}
          >
            <div className="flex shrink-0 flex-col md:hidden">
              <div className="mx-auto mt-3 h-1 w-8 shrink-0 rounded-full bg-muted" aria-hidden />
            </div>

            <Dialog.Title className="sr-only">Log pasture check</Dialog.Title>

            <div className="scroll-shadow-header shrink-0 rounded-t-2xl bg-card">
              <div className="grid shrink-0 grid-cols-[1fr_auto_1fr] items-center gap-2 border-b border-border px-4 pb-3 pt-4 md:px-6 md:pt-5 md:pb-3">
                <span className="min-w-0" aria-hidden />
                <p className="text-center text-base font-medium text-foreground">Log pasture check</p>
                <div className="flex justify-end">
                  <Dialog.Close
                    type="button"
                    className={cn(buttonVariants({ variant: "icon", size: "iconGhost" }))}
                    aria-label="Close"
                  >
                    <X className="size-4" aria-hidden />
                  </Dialog.Close>
                </div>
              </div>
              <div className="flex items-start justify-between gap-3 px-4 py-4 md:px-6">
                <div className="flex min-w-0 flex-1 items-start gap-3">
                  <div className="relative flex size-12 shrink-0 items-center justify-center overflow-hidden rounded-xl bg-muted">
                    {PASTURE_SEED_MEDIA[pastureName]?.imageUrl ? (
                      <img
                        src={PASTURE_SEED_MEDIA[pastureName]!.imageUrl}
                        alt=""
                        className="size-full object-cover object-center"
                      />
                    ) : (
                      <span className="text-[13px] font-semibold text-muted-foreground" aria-hidden>
                        {pastureName.slice(0, 2).toUpperCase()}
                      </span>
                    )}
                  </div>
                  <div className="min-w-0 flex-1">
                    <div className="flex flex-wrap items-center gap-2">
                      <span className="text-base font-medium text-foreground">{pastureName}</span>
                    </div>
                    {pastureSubtitle ? (
                      <p className="mt-0.5 text-[13px] text-muted-foreground">{pastureSubtitle}</p>
                    ) : null}
                  </div>
                </div>
              </div>
            </div>

            <div className="min-h-0 flex-1 overflow-y-auto overflow-x-visible">
              <div className="px-5 pt-0 pb-[var(--scroll-area-bottom-pad)] md:px-7 md:pt-0">{body}</div>
            </div>

            <LogObservationFormFooter variant="sheet" api={footerApi} />
          </Dialog.Popup>
        </Dialog.Viewport>
      </Dialog.Portal>
    </Dialog.Root>
  )
}

