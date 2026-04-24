import { Dialog } from "@base-ui/react/dialog"
import { X } from "lucide-react"
import { useState } from "react"
import { LogPastureCheckFormFields } from "@/components/LogPastureCheckFormFields"
import { Button, buttonVariants } from "@/components/ui/button"
import { cn } from "@/lib/utils"

export interface PastureCheckData {
  allClear: boolean
  notes: string
  loggedBy: string
}

export interface LogPastureCheckModalProps {
  open: boolean
  pastureName: string
  onClose: () => void
  onSave: (data: PastureCheckData) => void
}

type InnerProps = {
  pastureName: string
  onClose: () => void
  onSave: LogPastureCheckModalProps["onSave"]
}

function LogPastureCheckModalInner({ pastureName, onClose, onSave }: InnerProps) {
  const [allClear, setAllClear] = useState(true)
  const [notes, setNotes] = useState("")
  const [loggedBy, setLoggedBy] = useState("")

  const notesOk = allClear || notes.trim().length > 0
  const canSave = loggedBy.trim().length > 0 && notesOk

  function handleSave() {
    if (!canSave) return
    onSave({ allClear, notes: notes.trim(), loggedBy: loggedBy.trim() })
  }

  return (
    <>
      <Dialog.Title className="sr-only">Log check — {pastureName}</Dialog.Title>
      <div className="flex items-center justify-between border-b border-border px-6 py-4">
        <h2 className="text-lg font-semibold text-foreground">Log check — {pastureName}</h2>
        <Dialog.Close
          type="button"
          className={cn(buttonVariants({ variant: "icon", size: "iconGhost" }))}
          aria-label="Close"
        >
          <X className="size-4" />
        </Dialog.Close>
      </div>

      <div className="max-h-[min(70dvh,560px)] overflow-y-auto px-6 py-5">
        <LogPastureCheckFormFields
          variant="modal"
          pastureName={pastureName}
          allClear={allClear}
          onAllClearChange={setAllClear}
          notes={notes}
          onNotesChange={setNotes}
          loggedBy={loggedBy}
          onLoggedByChange={setLoggedBy}
        />
      </div>

      <div className="flex justify-end gap-2 border-t border-border px-6 py-4">
        <Button type="button" variant="tertiary" className="h-9 min-h-9 px-4 py-0" onClick={onClose}>
          Cancel
        </Button>
        <Button
          type="button"
          variant="default"
          className="h-9 min-h-9 px-4 py-0 disabled:opacity-60"
          disabled={!canSave}
          onClick={handleSave}
        >
          Save pasture check
        </Button>
      </div>
    </>
  )
}

export function LogPastureCheckModal({ open, pastureName, onClose, onSave }: LogPastureCheckModalProps) {
  return (
    <Dialog.Root
      open={open}
      onOpenChange={(next) => {
        if (!next) onClose()
      }}
    >
      <Dialog.Portal>
        <Dialog.Backdrop className="fixed inset-0 z-50 bg-black/55 backdrop-blur-[1px] transition-opacity data-[ending-style]:opacity-0" />
        <Dialog.Viewport className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <Dialog.Popup className="flex w-full min-w-0 max-w-lg flex-col overflow-hidden rounded-2xl border border-border bg-background shadow-xl outline-none">
            {open ? <LogPastureCheckModalInner pastureName={pastureName} onClose={onClose} onSave={onSave} /> : null}
          </Dialog.Popup>
        </Dialog.Viewport>
      </Dialog.Portal>
    </Dialog.Root>
  )
}
