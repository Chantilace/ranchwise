import { X } from "lucide-react"
import { useState } from "react"
import { Drawer } from "vaul"
import { LogPastureCheckFormFields } from "@/components/LogPastureCheckFormFields"
import { Button } from "@/components/ui/button"
import type { PastureCheckData } from "@/components/LogPastureCheckModal"

export type LogPastureCheckSheetProps = {
  pastureName: string
  onClose: () => void
  /** Persist check; do not close — sheet calls onClose after this resolves. */
  onSave: (data: PastureCheckData) => void | Promise<void>
}

export function LogPastureCheckSheet({ pastureName, onClose, onSave }: LogPastureCheckSheetProps) {
  const [allClear, setAllClear] = useState(true)
  const [notes, setNotes] = useState("")
  const [loggedBy, setLoggedBy] = useState("")
  const [isSaving, setIsSaving] = useState(false)

  const notesOk = allClear || notes.trim().length > 0
  const canSave = loggedBy.trim().length > 0 && notesOk

  async function handleSave() {
    if (!canSave || isSaving) return
    setIsSaving(true)
    try {
      await Promise.resolve(
        onSave({
          allClear,
          notes: notes.trim(),
          loggedBy: loggedBy.trim(),
        })
      )
      onClose()
    } catch {
      setIsSaving(false)
    }
  }

  return (
    <Drawer.Root
      open
      dismissible={!isSaving}
      onOpenChange={(open) => !open && !isSaving && onClose()}
    >
      <Drawer.Portal>
        <Drawer.Overlay className="fixed inset-0 z-40 bg-black/55 backdrop-blur-[1px]" />
        <Drawer.Content className="fixed right-0 bottom-0 left-0 z-50 flex max-h-[70vh] flex-col rounded-t-2xl bg-background outline-none">
          <Drawer.Title className="sr-only">Log pasture check — {pastureName}</Drawer.Title>
          <Drawer.Handle className="mx-auto mt-2.5 mb-2 block h-1 w-8 shrink-0 rounded-full bg-border" />

          <div className="flex shrink-0 items-center justify-between border-b border-border px-4 py-3">
            <div>
              <p className="text-sm font-bold text-foreground">Log pasture check</p>
              <p className="text-xs text-muted-foreground">{pastureName}</p>
            </div>
            <Button
              type="button"
              variant="icon"
              size="iconGhost"
              className="shrink-0"
              aria-label="Close"
              onClick={onClose}
              disabled={isSaving}
            >
              <X className="size-4" aria-hidden />
            </Button>
          </div>

          <div className="min-h-0 flex-1 overflow-y-auto px-4 py-4">
            <LogPastureCheckFormFields
              variant="sheet"
              pastureName={pastureName}
              allClear={allClear}
              onAllClearChange={setAllClear}
              notes={notes}
              onNotesChange={setNotes}
              loggedBy={loggedBy}
              onLoggedByChange={setLoggedBy}
            />
          </div>

          <div className="flex shrink-0 flex-wrap justify-end gap-2 border-t border-border px-4 py-3">
            <Button
              type="button"
              variant="tertiary"
              className="h-9 min-h-9 px-4 py-0"
              onClick={onClose}
              disabled={isSaving}
            >
              Cancel
            </Button>
            <Button
              type="button"
              variant="default"
              className="h-9 min-h-9 px-4 py-0 disabled:opacity-60"
              onClick={() => void handleSave()}
              disabled={!canSave || isSaving}
            >
              {isSaving ? "Saving..." : "Save pasture check"}
            </Button>
          </div>
        </Drawer.Content>
      </Drawer.Portal>
    </Drawer.Root>
  )
}
