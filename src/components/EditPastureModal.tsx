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
  /** When set, shows a destructive “Delete pasture” control (e.g. profile edit). */
  onDelete?: () => void
}

export function EditPastureModal({ open, pasture, onClose, onSave, onDelete }: EditPastureModalProps) {
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

  function handleDeletePasture() {
    if (!pasture || !onDelete) return
    if (
      !window.confirm(
        `Remove ${pasture.name} from the ranch? Cattle and horses assigned here will be moved to another pasture. This cannot be undone.`,
      )
    )
      return
    onDelete()
    onClose()
  }

  return (
    <Dialog.Root open={open} onOpenChange={(next) => !next && onClose()}>
      <Dialog.Portal>
        <Dialog.Backdrop className="fixed inset-0 z-[120] bg-black/55 backdrop-blur-[1px] transition-opacity data-[ending-style]:opacity-0" />
        <Dialog.Viewport className="fixed inset-0 z-[120] flex items-end justify-center p-0 md:items-center md:p-4">
          <Dialog.Popup
            className={cn(
              "flex w-full min-w-0 max-w-full flex-col overflow-hidden border border-border bg-background text-foreground shadow-xl outline-none",
              "max-h-[90dvh] min-h-0 rounded-t-2xl md:max-h-[min(90dvh,680px)] md:max-w-md md:rounded-2xl",
              "translate-y-0 transition-transform duration-200 ease-out data-[starting-style]:translate-y-full md:data-[starting-style]:translate-y-0 md:data-[starting-style]:scale-95",
            )}
          >
            {open && pasture ? (
              <form onSubmit={handleSubmit} className="flex min-h-0 flex-1 flex-col">
                <div className="flex shrink-0 flex-col md:hidden">
                  <div className="mx-auto mt-3 h-1 w-8 shrink-0 rounded-full bg-muted" aria-hidden />
                </div>
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
                <div className="min-h-0 flex-1 overflow-y-auto">
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
                </div>
                <div className="flex shrink-0 flex-wrap items-center gap-3 border-t border-border px-4 py-3 md:px-5">
                  {onDelete ? (
                    <Button type="button" variant="destructive" className="text-sm" onClick={handleDeletePasture}>
                      Delete pasture
                    </Button>
                  ) : null}
                  <div className={cn("flex flex-wrap justify-end gap-2", onDelete ? "ml-auto" : "w-full")}>
                    <Button type="button" variant="secondary" className="text-sm" onClick={onClose}>
                      Cancel
                    </Button>
                    <Button type="submit" variant="primary" className="text-sm">
                      Save
                    </Button>
                  </div>
                </div>
              </form>
            ) : null}
          </Dialog.Popup>
        </Dialog.Viewport>
      </Dialog.Portal>
    </Dialog.Root>
  )
}
