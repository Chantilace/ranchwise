import { Dialog } from "@base-ui/react/dialog"
import { X } from "lucide-react"
import { useEffect, useState } from "react"
import { Button, buttonVariants } from "@/components/ui/button"
import { FormLabel } from "@/components/ui/form-label"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import type { Pasture } from "@/types/cattle"
import { cn } from "@/lib/utils"

export type EditPastureModalProps = {
  open: boolean
  pasture: Pasture | null
  onClose: () => void
  onSave: (pastureId: string, patch: Partial<Pasture>) => void
}

export function EditPastureModal({ open, pasture, onClose, onSave }: EditPastureModalProps) {
  const [name, setName] = useState("")
  const [terrain, setTerrain] = useState("")
  const [acreage, setAcreage] = useState("")
  const [waterSource, setWaterSource] = useState("")
  const [fenceStatus, setFenceStatus] = useState("")

  useEffect(() => {
    if (!pasture) return
    setName(pasture.name)
    setTerrain(pasture.terrain)
    setAcreage(String(pasture.acreage))
    setWaterSource(pasture.waterSource)
    setFenceStatus(pasture.fenceStatus)
  }, [pasture])

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!pasture) return
    const acres = Number.parseFloat(acreage)
    onSave(pasture.id, {
      name: name.trim() || pasture.name,
      terrain: terrain.trim() || pasture.terrain,
      acreage: Number.isFinite(acres) && acres > 0 ? acres : pasture.acreage,
      waterSource: waterSource.trim() || pasture.waterSource,
      fenceStatus: fenceStatus.trim() || pasture.fenceStatus,
    })
    onClose()
  }

  return (
    <Dialog.Root open={open} onOpenChange={(next) => !next && onClose()}>
      <Dialog.Portal>
        <Dialog.Backdrop className="fixed inset-0 z-50 bg-black/55 backdrop-blur-[1px] transition-opacity data-[ending-style]:opacity-0" />
        <Dialog.Viewport className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <Dialog.Popup className="flex w-full min-w-0 max-w-md flex-col overflow-hidden rounded-2xl border border-border bg-background shadow-xl outline-none">
            {open && pasture ? (
              <form onSubmit={handleSubmit} className="flex flex-col">
                <div className="flex items-center justify-between border-b border-border px-4 py-3 md:px-5">
                  <Dialog.Title className="text-base font-medium text-foreground">Edit pasture</Dialog.Title>
                  <Dialog.Close
                    type="button"
                    className={cn(buttonVariants({ variant: "icon", size: "iconGhost" }))}
                    aria-label="Close"
                  >
                    <X className="size-4" aria-hidden />
                  </Dialog.Close>
                </div>
                <div className="flex flex-col gap-3 px-4 py-4 md:px-5">
                  <label className="flex flex-col gap-1.5">
                    <FormLabel variant="default">Name</FormLabel>
                    <Input value={name} onChange={(e) => setName(e.target.value)} required />
                  </label>
                  <label className="flex flex-col gap-1.5">
                    <FormLabel variant="default">Terrain</FormLabel>
                    <Input value={terrain} onChange={(e) => setTerrain(e.target.value)} />
                  </label>
                  <label className="flex flex-col gap-1.5">
                    <FormLabel variant="default">Acreage</FormLabel>
                    <Input
                      inputMode="decimal"
                      value={acreage}
                      onChange={(e) => setAcreage(e.target.value)}
                    />
                  </label>
                  <label className="flex flex-col gap-1.5">
                    <FormLabel variant="default">Water</FormLabel>
                    <Textarea rows={2} value={waterSource} onChange={(e) => setWaterSource(e.target.value)} />
                  </label>
                  <label className="flex flex-col gap-1.5">
                    <FormLabel variant="default">Fence</FormLabel>
                    <Textarea rows={2} value={fenceStatus} onChange={(e) => setFenceStatus(e.target.value)} />
                  </label>
                </div>
                <div className="flex justify-end gap-2 border-t border-border px-4 py-3 md:px-5">
                  <Button type="button" variant="secondary" onClick={onClose}>
                    Cancel
                  </Button>
                  <Button type="submit" variant="primary">
                    Save
                  </Button>
                </div>
              </form>
            ) : null}
          </Dialog.Popup>
        </Dialog.Viewport>
      </Dialog.Portal>
    </Dialog.Root>
  )
}
