import { X } from "lucide-react"
import { useRef, useState, type ChangeEvent } from "react"
import { Drawer } from "vaul"
import {
  ADD_HORSE_MAX_PHOTO_BYTES,
  AddHorseFormFields,
  addHorseFormRequiredOk,
  buildNewHorseDataFromForm,
} from "@/components/AddHorseFormFields"
import { Button } from "@/components/ui/button"
import type { NewHorseData } from "@/lib/addHorseForm"

export type AddHorseSheetProps = {
  pastures: string[]
  onClose: () => void
  onSave: (data: NewHorseData) => void
}

export function AddHorseSheet({ pastures, onClose, onSave }: AddHorseSheetProps) {
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

  function handleSave() {
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
    onClose()
  }

  return (
    <Drawer.Root open onOpenChange={(open) => !open && onClose()}>
      <Drawer.Portal>
        <Drawer.Overlay className="fixed inset-0 z-40 bg-black/55 backdrop-blur-[1px]" />
        <Drawer.Content className="fixed right-0 bottom-0 left-0 z-50 flex max-h-[90vh] flex-col rounded-t-2xl bg-background outline-none">
          <Drawer.Title className="sr-only">Add horse</Drawer.Title>
          <Drawer.Handle className="mx-auto mt-2.5 mb-2 block h-1 w-8 shrink-0 rounded-full bg-border" />

          <div className="flex shrink-0 items-center justify-between border-b border-border px-4 py-3">
            <p className="text-sm font-bold text-foreground">Add horse</p>
            <Button
              type="button"
              variant="icon"
              size="iconGhost"
              className="shrink-0"
              aria-label="Close"
              onClick={onClose}
            >
              <X className="size-4" aria-hidden />
            </Button>
          </div>

          <div className="min-h-0 flex-1 overflow-y-auto px-4 py-4">
            <AddHorseFormFields
              variant="sheet"
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

          <div className="flex shrink-0 gap-2 border-t border-border px-4 py-3">
            <Button type="button" variant="secondary" className="min-w-0 flex-1" onClick={onClose}>
              Cancel
            </Button>
            <Button
              type="button"
              variant="primary"
              className="min-w-0 flex-[2]"
              disabled={!requiredOk}
              onClick={handleSave}
            >
              Add horse
            </Button>
          </div>
        </Drawer.Content>
      </Drawer.Portal>
    </Drawer.Root>
  )
}
