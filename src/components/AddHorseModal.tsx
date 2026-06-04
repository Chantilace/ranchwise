import { Dialog } from "@base-ui/react/dialog"
import { X } from "lucide-react"
import { useRef, useState, type ChangeEvent } from "react"
import {
  ADD_HORSE_MAX_PHOTO_BYTES,
  AddHorseFormFields,
  addHorseFormRequiredOk,
  buildNewHorseDataFromForm,
} from "@/components/AddHorseFormFields"
import { Button, buttonVariants } from "@/components/ui/button"
import { cn } from "@/lib/utils"
import type { NewHorseData } from "@/lib/addHorseForm"

export type { NewHorseData } from "@/lib/addHorseForm"

export interface AddHorseModalProps {
  open: boolean
  /** Distinct pasture names from the current herd (see `useRanchData().pastureOptions`). */
  pastures: string[]
  onClose: () => void
  onSave: (data: NewHorseData) => void
}

type InnerProps = {
  pastures: string[]
  onClose: () => void
  onSave: (data: NewHorseData) => void
}

function AddHorseFormInner({ pastures, onClose, onSave }: InnerProps) {
  const [expanded, setExpanded] = useState(false)
  const [name, setName] = useState("")
  const [sex, setSex] = useState("")
  const [ageRaw, setAgeRaw] = useState("")
  const [role, setRole] = useState("")
  const [pasture, setPasture] = useState("")
  const [feed, setFeed] = useState<NonNullable<NewHorseData["feed"]>>([])
  const [notes, setNotes] = useState("")
  const [photoDataUrl, setPhotoDataUrl] = useState<string | undefined>(undefined)
  const fileInputRef = useRef<HTMLInputElement>(null)

  const requiredOk = addHorseFormRequiredOk({ name, sex, ageRaw, role, pasture })

  function handleFileChange(e: ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    if (!file) {
      setPhotoDataUrl(undefined)
      return
    }
    if (!file.type.startsWith("image/")) {
      e.target.value = ""
      return
    }
    if (file.size > ADD_HORSE_MAX_PHOTO_BYTES) {
      e.target.value = ""
      return
    }
    const reader = new FileReader()
    reader.onload = () => {
      if (typeof reader.result === "string") setPhotoDataUrl(reader.result)
    }
    reader.readAsDataURL(file)
  }

  function handleCreate() {
    const data = buildNewHorseDataFromForm({
      name,
      sex,
      ageRaw,
      role,
      pasture,
      feed,
      notes,
      photoDataUrl,
    })
    if (!data) return
    onSave(data)
  }

  return (
    <>
      <Dialog.Title className="sr-only">Add horse</Dialog.Title>
      <div className="flex items-center justify-between border-b border-border px-6 py-4">
        <h2 className="text-lg font-semibold text-foreground">Add horse</h2>
        <Dialog.Close
          type="button"
          className={cn(buttonVariants({ variant: "icon", size: "iconGhost" }))}
          aria-label="Close"
        >
          <X className="size-4" />
        </Dialog.Close>
      </div>

      <div className="min-h-0 flex-1 overflow-y-auto px-6 py-5">
        <AddHorseFormFields
          variant="modal"
          pastures={pastures}
          name={name}
          onNameChange={setName}
          sex={sex}
          onSexChange={setSex}
          ageRaw={ageRaw}
          onAgeRawChange={setAgeRaw}
          role={role}
          onRoleChange={setRole}
          pasture={pasture}
          onPastureChange={setPasture}
          feed={feed}
          onFeedChange={setFeed}
          notes={notes}
          onNotesChange={setNotes}
          fileInputRef={fileInputRef}
          onPhotoFileChange={handleFileChange}
          expanded={expanded}
          onExpandedChange={setExpanded}
        />
      </div>

      <div className="flex justify-end gap-2 border-t border-border px-6 py-4">
        <Button type="button" variant="secondary" onClick={onClose}>
          Cancel
        </Button>
        <Button type="button" variant="primary" disabled={!requiredOk} onClick={handleCreate}>
          Create horse
        </Button>
      </div>
    </>
  )
}

export function AddHorseModal({ open, pastures, onClose, onSave }: AddHorseModalProps) {
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
          <Dialog.Popup className="flex w-full min-w-0 max-w-2xl flex-col max-h-[min(90dvh,880px)] overflow-hidden rounded-2xl border border-border bg-background shadow-xl outline-none">
            {open ? <AddHorseFormInner pastures={pastures} onClose={onClose} onSave={onSave} /> : null}
          </Dialog.Popup>
        </Dialog.Viewport>
      </Dialog.Portal>
    </Dialog.Root>
  )
}
