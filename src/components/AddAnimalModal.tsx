import { Dialog } from "@base-ui/react/dialog"
import { useCallback, useEffect, useMemo, useState } from "react"
import { Drawer } from "vaul"
import { X } from "lucide-react"
import {
  ADD_ANIMAL_BREED_OPTIONS,
  ADD_ANIMAL_SEX_OPTIONS,
  ADD_ANIMAL_STATUS_OPTIONS,
  addAnimalFormRequiredOk,
  buildCattleFromAddAnimalForm,
  emptyAddAnimalFormState,
  type AddAnimalFormState,
} from "@/lib/addAnimalForm"
import { Button, buttonVariants } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import { useRanchData } from "@/contexts/RanchDataContext"
import { useMediaQuery } from "@/hooks/useMediaQuery"
import { AppMenuSelect } from "@/components/ui/app-menu-select"
import { FormLabel } from "@/components/ui/form-label"
import { useOverlayRegistration } from "@/contexts/OverlayRegistryContext"
import { cn } from "@/lib/utils"

function AddAnimalFieldLabel({
  children,
  required,
}: {
  children: React.ReactNode
  required?: boolean
}) {
  return (
    <FormLabel variant="default" className="mb-1.5">
      {children}
      {required ? " *" : null}
    </FormLabel>
  )
}

export type AddAnimalModalProps = {
  open: boolean
  onOpenChange: (open: boolean) => void
  /** Pre-select pasture when opening from a pasture roster. */
  defaultPastureId?: string
}

export function AddAnimalModal({ open, onOpenChange, defaultPastureId }: AddAnimalModalProps) {
  useOverlayRegistration(open)
  const isMobile = useMediaQuery("(max-width: 640px)")
  const { pastures, appendCattle } = useRanchData()
  const [form, setForm] = useState<AddAnimalFormState>(() => emptyAddAnimalFormState(defaultPastureId))

  const fallbackPastureId = pastures[0]?.id ?? "east"

  useEffect(() => {
    if (!open) return
    setForm(emptyAddAnimalFormState(defaultPastureId))
  }, [open, defaultPastureId])

  const patch = useCallback(<K extends keyof AddAnimalFormState>(key: K, value: AddAnimalFormState[K]) => {
    setForm((prev) => ({ ...prev, [key]: value }))
  }, [])

  const requiredOk = useMemo(() => addAnimalFormRequiredOk(form), [form])

  const breedMenuOptions = useMemo(
    () => ADD_ANIMAL_BREED_OPTIONS.map((b) => ({ value: b, label: b })),
    []
  )
  const sexMenuOptions = useMemo(
    () => ADD_ANIMAL_SEX_OPTIONS.map((s) => ({ value: s, label: s })),
    []
  )
  const statusMenuOptions = useMemo(
    () => ADD_ANIMAL_STATUS_OPTIONS.map((o) => ({ value: o.value, label: o.label })),
    []
  )
  const pastureMenuOptions = useMemo(
    () => [
      { value: "", label: "—" },
      ...pastures.map((p) => ({ value: p.id, label: p.name })),
    ],
    [pastures]
  )

  const handleSubmit = useCallback(() => {
    const row = buildCattleFromAddAnimalForm(form, {
      defaultPastureId,
      fallbackPastureId,
    })
    if (!row) return
    appendCattle(row)
    onOpenChange(false)
  }, [appendCattle, defaultPastureId, fallbackPastureId, form, onOpenChange])

  const close = useCallback(() => onOpenChange(false), [onOpenChange])

  const pastureSelect = (
    <>
      <AddAnimalFieldLabel>Pasture</AddAnimalFieldLabel>
      <AppMenuSelect
        value={form.pastureId}
        onValueChange={(v) => patch("pastureId", v)}
        options={pastureMenuOptions}
        placeholder="—"
        aria-label="Pasture"
      />
    </>
  )

  const notesField = (
    <>
      <AddAnimalFieldLabel>Notes</AddAnimalFieldLabel>
      <Textarea
        placeholder="Health notes, lineage, etc."
        className="min-h-[80px]"
        value={form.notes}
        onChange={(e) => patch("notes", e.target.value)}
      />
    </>
  )

  if (isMobile) {
    return (
      <Drawer.Root
        open={open}
        dismissible={requiredOk}
        onOpenChange={(next) => {
          if (!next) {
            if (requiredOk) close()
          }
        }}
      >
        <Drawer.Portal>
          <Drawer.Overlay className="fixed inset-0 z-50 bg-black/55 backdrop-blur-[1px]" />
          <Drawer.Content className="fixed right-0 bottom-0 left-0 z-50 flex max-h-[90vh] flex-col rounded-t-2xl bg-white outline-none">
            <Drawer.Title className="sr-only">Add animal</Drawer.Title>
            <div className="flex shrink-0 justify-center pt-3 pb-1">
              <div className="h-1 w-10 rounded-full bg-gray-200" />
            </div>
            <div className="flex shrink-0 items-center justify-between border-b border-border px-5 pb-3 pl-5 pr-5 pt-2">
              <h2 className="text-lg font-medium text-foreground">Add animal</h2>
              <Button
                type="button"
                variant="icon"
                size="iconGhost"
                className="shrink-0"
                aria-label="Close"
                onClick={close}
              >
                <X className="size-4" aria-hidden />
              </Button>
            </div>

            <div className="min-h-0 flex-1 overflow-y-auto px-5 py-4">
              <div className="flex flex-col gap-4">
                <div>
                  <AddAnimalFieldLabel required>Tag number</AddAnimalFieldLabel>
                  <Input
                    placeholder="e.g. A-0042"
                    value={form.tagNumber}
                    onChange={(e) => patch("tagNumber", e.target.value)}
                  />
                </div>
                <div>
                  <AddAnimalFieldLabel>Name</AddAnimalFieldLabel>
                  <Input placeholder="Optional" value={form.name} onChange={(e) => patch("name", e.target.value)} />
                </div>
                <div>
                  <AddAnimalFieldLabel required>Breed</AddAnimalFieldLabel>
                  <AppMenuSelect
                    value={form.breed}
                    onValueChange={(v) => patch("breed", v)}
                    options={breedMenuOptions}
                    placeholder="Select breed"
                    aria-label="Breed"
                  />
                </div>
                <div>
                  <AddAnimalFieldLabel required>Sex</AddAnimalFieldLabel>
                  <AppMenuSelect
                    value={form.sex}
                    onValueChange={(v) => patch("sex", v)}
                    options={sexMenuOptions}
                    placeholder="Select sex"
                    aria-label="Sex"
                  />
                </div>
                <div>
                  <AddAnimalFieldLabel>Date of birth</AddAnimalFieldLabel>
                  <Input type="date" value={form.dateOfBirth} onChange={(e) => patch("dateOfBirth", e.target.value)} />
                </div>
                <div>
                  <AddAnimalFieldLabel>Weight (lbs)</AddAnimalFieldLabel>
                  <Input
                    type="number"
                    placeholder="e.g. 1200"
                    value={form.weightLbs}
                    onChange={(e) => patch("weightLbs", e.target.value)}
                  />
                </div>
                <div>
                  <AddAnimalFieldLabel required>Status</AddAnimalFieldLabel>
                  <AppMenuSelect
                    value={form.status}
                    onValueChange={(v) => patch("status", v as AddAnimalFormState["status"])}
                    options={statusMenuOptions}
                    aria-label="Status"
                  />
                </div>

                <div
                  className={cn(
                    "transition-all duration-200 ease-out",
                    form.status === "deceased" ? "max-h-32 opacity-100" : "max-h-0 overflow-hidden opacity-0"
                  )}
                >
                  {form.status === "deceased" ? (
                    <div>
                      <AddAnimalFieldLabel>Date of death</AddAnimalFieldLabel>
                      <Input type="date" value={form.dateOfDeath} onChange={(e) => patch("dateOfDeath", e.target.value)} />
                    </div>
                  ) : null}
                </div>

                <div
                  className={cn(
                    "flex flex-col gap-4 transition-all duration-200 ease-out",
                    form.status === "sold" ? "max-h-48 opacity-100" : "max-h-0 overflow-hidden opacity-0"
                  )}
                >
                  {form.status === "sold" ? (
                    <>
                      <div>
                        <AddAnimalFieldLabel>Sale date</AddAnimalFieldLabel>
                        <Input type="date" value={form.saleDate} onChange={(e) => patch("saleDate", e.target.value)} />
                      </div>
                      <div>
                        <AddAnimalFieldLabel>Buyer</AddAnimalFieldLabel>
                        <Input placeholder="Optional" value={form.buyer} onChange={(e) => patch("buyer", e.target.value)} />
                      </div>
                    </>
                  ) : null}
                </div>

                <div>{pastureSelect}</div>
                <div>{notesField}</div>
              </div>
            </div>

            <div className="flex shrink-0 gap-3 border-t border-border px-5 py-4">
              <Button type="button" variant="secondary" size="lg" className="min-w-0 flex-1" onClick={close}>
                Cancel
              </Button>
              <Button
                type="button"
                variant="primary"
                disabled={!requiredOk}
                size="lg"
                className="min-w-0 flex-1"
                onClick={handleSubmit}
              >
                Add animal
              </Button>
            </div>
          </Drawer.Content>
        </Drawer.Portal>
      </Drawer.Root>
    )
  }

  return (
    <Dialog.Root
      open={open}
      onOpenChange={(next) => {
        if (!next) close()
      }}
    >
      <Dialog.Portal>
        <Dialog.Backdrop className="fixed inset-0 z-50 bg-black/55 backdrop-blur-[1px] transition-opacity data-[ending-style]:opacity-0" />
        <Dialog.Viewport className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <Dialog.Popup className="flex max-h-[min(90dvh,880px)] w-full max-w-2xl flex-col overflow-hidden rounded-2xl border border-border bg-background shadow-xl outline-none">
            <Dialog.Title className="sr-only">Add animal</Dialog.Title>
            <div className="flex shrink-0 items-center justify-between border-b border-border px-6 py-4">
              <h2 className="text-xl font-medium text-foreground">Add animal</h2>
              <Dialog.Close
                type="button"
                className={cn(buttonVariants({ variant: "icon", size: "iconGhost" }), "shrink-0")}
                aria-label="Close"
              >
                <X className="size-4" aria-hidden />
              </Dialog.Close>
            </div>

            <div className="min-h-0 flex-1 overflow-y-auto px-6 py-5">
              <div className="mt-1 grid grid-cols-2 gap-x-5 gap-y-4">
                <div>
                  <AddAnimalFieldLabel required>Tag number</AddAnimalFieldLabel>
                  <Input
                    placeholder="e.g. A-0042"
                    value={form.tagNumber}
                    onChange={(e) => patch("tagNumber", e.target.value)}
                  />
                </div>
                <div>
                  <AddAnimalFieldLabel>Name</AddAnimalFieldLabel>
                  <Input placeholder="Optional" value={form.name} onChange={(e) => patch("name", e.target.value)} />
                </div>
                <div>
                  <AddAnimalFieldLabel required>Breed</AddAnimalFieldLabel>
                  <AppMenuSelect
                    value={form.breed}
                    onValueChange={(v) => patch("breed", v)}
                    options={breedMenuOptions}
                    placeholder="Select breed"
                    aria-label="Breed"
                  />
                </div>
                <div>
                  <AddAnimalFieldLabel required>Sex</AddAnimalFieldLabel>
                  <AppMenuSelect
                    value={form.sex}
                    onValueChange={(v) => patch("sex", v)}
                    options={sexMenuOptions}
                    placeholder="Select sex"
                    aria-label="Sex"
                  />
                </div>
                <div>
                  <AddAnimalFieldLabel>Date of birth</AddAnimalFieldLabel>
                  <Input type="date" value={form.dateOfBirth} onChange={(e) => patch("dateOfBirth", e.target.value)} />
                </div>
                <div>
                  <AddAnimalFieldLabel>Weight (lbs)</AddAnimalFieldLabel>
                  <Input
                    type="number"
                    placeholder="e.g. 1200"
                    value={form.weightLbs}
                    onChange={(e) => patch("weightLbs", e.target.value)}
                  />
                </div>
                <div>
                  <AddAnimalFieldLabel required>Status</AddAnimalFieldLabel>
                  <AppMenuSelect
                    value={form.status}
                    onValueChange={(v) => patch("status", v as AddAnimalFormState["status"])}
                    options={statusMenuOptions}
                    aria-label="Status"
                  />
                </div>
                <div>{pastureSelect}</div>

                <div
                  className={cn(
                    "col-span-2 grid grid-cols-2 gap-x-5 transition-all duration-200 ease-out",
                    form.status === "deceased" ? "max-h-40 opacity-100" : "max-h-0 overflow-hidden opacity-0"
                  )}
                >
                  {form.status === "deceased" ? (
                    <div>
                      <AddAnimalFieldLabel>Date of death</AddAnimalFieldLabel>
                      <Input type="date" value={form.dateOfDeath} onChange={(e) => patch("dateOfDeath", e.target.value)} />
                    </div>
                  ) : null}
                </div>

                <div
                  className={cn(
                    "col-span-2 grid grid-cols-2 gap-x-5 gap-y-4 transition-all duration-200 ease-out",
                    form.status === "sold" ? "max-h-40 opacity-100" : "max-h-0 overflow-hidden opacity-0"
                  )}
                >
                  {form.status === "sold" ? (
                    <>
                      <div>
                        <AddAnimalFieldLabel>Sale date</AddAnimalFieldLabel>
                        <Input type="date" value={form.saleDate} onChange={(e) => patch("saleDate", e.target.value)} />
                      </div>
                      <div>
                        <AddAnimalFieldLabel>Buyer</AddAnimalFieldLabel>
                        <Input placeholder="Optional" value={form.buyer} onChange={(e) => patch("buyer", e.target.value)} />
                      </div>
                    </>
                  ) : null}
                </div>

                <div className="col-span-2">{notesField}</div>
              </div>
            </div>

            <div className="flex shrink-0 justify-end gap-2 border-t border-border px-6 py-4">
              <Button type="button" variant="secondary" size="lg" onClick={close}>
                Cancel
              </Button>
              <Button type="button" variant="primary" disabled={!requiredOk} size="lg" onClick={handleSubmit}>
                Add animal
              </Button>
            </div>
          </Dialog.Popup>
        </Dialog.Viewport>
      </Dialog.Portal>
    </Dialog.Root>
  )
}
